import json
import time
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from uuid import UUID

from pydantic import ValidationError

from app.config import Settings
from app.database import Database
from app.models import Email, EmailAnalysisRecord
from app.repositories import analysis_repository as analyses
from app.repositories import email_query_repository as queries
from app.repositories import email_repository as emails
from app.repositories import gmail_connection_repository as connections
from app.repositories import operation_repository as operations
from app.repositories import user_repository as users
from app.schemas.analysis_schema import EmailAnalysis, EmailInput
from app.schemas.email_schema import EmailQuery, PageQuery, SyncResult
from app.services.ai_service import AnalysisError, analyze_email
from app.services.auth_service import credentials_for_user
from app.services.gmail_service import create_gmail_client, get_message, list_message_ids
from app.services.integration_errors import IntegrationError
from app.utils.deadline import remaining_time


def require_user(database: Database, user_id: UUID) -> None:
    with database.session_factory.begin() as session:
        if users.get_user(session, user_id) is None:
            raise IntegrationError("AUTH_REQUIRED", "Connect Gmail to continue.", 401)


@contextmanager
def operation(database: Database, user_id: UUID) -> Iterator[UUID]:
    with database.session_factory.begin() as session:
        operation_id = operations.acquire_operation(session, user_id)
    try:
        yield operation_id
    finally:
        with database.session_factory.begin() as session:
            operations.release_operation(session, user_id, operation_id)


def analysis_data(record: EmailAnalysisRecord | None) -> dict | None:
    if record is None:
        return None
    fields = (
        "summary",
        "category",
        "priority",
        "deadline",
        "deadline_text",
        "requested_action",
        "suggested_action",
        "reply_needed",
        "draft_reply",
    )
    return {
        "id": str(record.id),
        "status": record.status,
        "model_identifier": record.model_identifier,
        "error_code": record.error_code,
        "created_at": record.created_at.isoformat(),
        **{
            name: value.isoformat() if hasattr(value, "isoformat") else value
            for name in fields
            if (value := getattr(record, name)) is not None
        },
    }


def email_data(
    email: Email, status: str, completed: EmailAnalysisRecord | None, *, detail: bool = False
) -> dict:
    data = {
        "id": str(email.id),
        "sender": email.sender,
        "subject": email.subject,
        "received_at": email.received_at.isoformat() if email.received_at else None,
        "analysis_status": status,
        "latest_completed_analysis": analysis_data(completed),
    }
    if detail:
        data.update(
            body=email.body,
            gmail_message_id=email.gmail_message_id,
            gmail_thread_id=email.gmail_thread_id,
        )
    return data


def list_user_emails(database: Database, user_id: UUID, query: EmailQuery) -> dict:
    with database.session_factory.begin() as session:
        rows, total = queries.email_page(session, user_id, query)
        return {
            "emails": [email_data(*row) for row in rows],
            "total": total,
            "limit": query.limit,
            "offset": query.offset,
        }


def user_overview(database: Database, user_id: UUID) -> dict:
    with database.session_factory.begin() as session:
        user = users.get_user(session, user_id)
        if user is None:
            raise IntegrationError("AUTH_REQUIRED", "Connect Gmail to continue.", 401)
        connection = connections.get_connection(session, user_id)
        synced = connection.last_synced_at if connection else None
        return {
            "email": user.email,
            "timezone": user.timezone,
            "last_synced_at": synced.isoformat() if synced else None,
            **queries.overview_counts(session, user_id),
        }


def email_detail(database: Database, user_id: UUID, email_id: UUID) -> dict:
    with database.session_factory.begin() as session:
        email = emails.get_email(session, user_id, email_id)
        if email is None:
            raise IntegrationError("EMAIL_NOT_FOUND", "Email not found.", 404)
        latest = queries.latest_attempt(session, email.id)
        return email_data(
            email,
            latest.status if latest else "pending",
            analyses.latest_completed_analysis(session, user_id, email.id),
            detail=True,
        )


def analysis_history(database: Database, user_id: UUID, email_id: UUID, query: PageQuery) -> dict:
    with database.session_factory.begin() as session:
        if emails.get_email(session, user_id, email_id) is None:
            raise IntegrationError("EMAIL_NOT_FOUND", "Email not found.", 404)
        records, total = queries.history_page(
            session, email_id, limit=query.limit, offset=query.offset
        )
        return {
            "analyses": [analysis_data(record) for record in records],
            "total": total,
            "limit": query.limit,
            "offset": query.offset,
        }


def sync_emails(settings: Settings, database: Database, user_id: UUID) -> dict:
    result = SyncResult()
    deadline = time.monotonic() + 60
    with operation(database, user_id) as operation_id:
        credentials = credentials_for_user(settings, database, user_id, deadline=deadline)
        client = create_gmail_client(credentials)
        try:
            message_ids = list_message_ids(
                client, limit=20, query=settings.gmail_sync_query, deadline=deadline
            )
            for index, message_id in enumerate(message_ids):
                try:
                    remaining_time(deadline)
                    with database.session_factory.begin() as session:
                        connection = operations.require_operation(session, user_id, operation_id)
                        stored = session.scalar(
                            emails.owned_emails(user_id).where(Email.gmail_message_id == message_id)
                        )
                        if stored is not None:
                            result.existing += 1
                            latest = queries.latest_attempt(session, stored.id)
                            if latest is None:
                                analyses.create_analysis(
                                    session,
                                    user_id,
                                    stored.id,
                                    model_identifier=settings.openrouter_model,
                                )
                            if latest is None or latest.status == "pending":
                                result.pending_email_ids.append(str(stored.id))
                            continue
                        connection_id = connection.id
                    normalized = get_message(client, message_id, deadline=deadline)
                    with database.session_factory.begin() as session:
                        operations.require_operation(session, user_id, operation_id)
                        email = emails.save_email(
                            session,
                            user_id,
                            gmail_connection_id=connection_id,
                            **normalized.model_dump(),
                        )
                        analyses.create_analysis(
                            session, user_id, email.id, model_identifier=settings.openrouter_model
                        )
                        result.pending_email_ids.append(str(email.id))
                        result.imported += 1
                except IntegrationError as error:
                    if error.code in {
                        "SYNC_TIME_BUDGET",
                        "OPERATION_EXPIRED",
                        "GMAIL_RATE_LIMITED",
                        "GMAIL_REAUTH_REQUIRED",
                        "GMAIL_PERMISSION_DENIED",
                        "GMAIL_UNAVAILABLE",
                    }:
                        result.deferred = len(message_ids) - index
                        result.errors.append({"code": error.code, "message": error.message})
                        break
                    result.failed += 1
                    result.errors.append({"code": error.code, "message": error.message})
        finally:
            client.close()
        if not (result.failed or result.deferred or result.errors):
            with database.session_factory.begin() as session:
                connection = operations.require_operation(session, user_id, operation_id)
                connection.last_synced_at = datetime.now(UTC)
    return result.model_dump()


def process_email(
    settings: Settings, database: Database, user_id: UUID, email_id: UUID, *, force: bool = False
) -> dict:
    with operation(database, user_id) as operation_id:
        with database.session_factory.begin() as session:
            operations.require_operation(session, user_id, operation_id)
            email = emails.get_email(session, user_id, email_id)
            if email is None:
                raise IntegrationError("EMAIL_NOT_FOUND", "Email not found.", 404)
            latest = queries.latest_attempt(session, email_id)
            if latest and latest.status == "completed" and not force:
                return {"analysis": analysis_data(latest), "reused": True}
            if latest and latest.status == "pending":
                record = latest
            else:
                record = analyses.create_analysis(
                    session, user_id, email_id, model_identifier=settings.openrouter_model
                )
            record.status = "processing"
            record.model_identifier = settings.openrouter_model
            record_id = record.id
            user = users.get_user(session, user_id)
            raw_input = dict(
                subject=email.subject or "",
                sender=email.sender,
                body=email.body or "",
                received_at=email.received_at,
                timezone=user.timezone,
            )
        try:
            try:
                validated_input = EmailInput.model_validate(raw_input)
            except ValidationError:
                raise AnalysisError(
                    "EMAIL_INPUT_INVALID", "This email has no supported text or timestamp.", 422
                ) from None
            # Short guard immediately before sending stored content to the provider.
            with database.session_factory.begin() as session:
                operations.require_operation(session, user_id, operation_id)
            result = analyze_email(validated_input, settings)
            try:
                validated_result = EmailAnalysis.model_validate_json(json.dumps(result["analysis"]))
                if not isinstance(result.get("model"), str) or not result["model"].strip():
                    raise ValueError("Missing model identifier")
            except ValueError, KeyError, TypeError:
                raise AnalysisError(
                    "AI_INVALID_OUTPUT", "The AI returned invalid analysis.", 502
                ) from None
        except AnalysisError as error:
            with database.session_factory.begin() as session:
                operations.require_operation(session, user_id, operation_id)
                analyses.update_analysis(
                    session, user_id, record_id, status="failed", error_code=error.code
                )
            raise
        with database.session_factory.begin() as session:
            operations.require_operation(session, user_id, operation_id)
            record = analyses.get_analysis(session, user_id, record_id)
            record.model_identifier = result["model"]
            analyses.update_analysis(
                session, user_id, record_id, status="completed", result=validated_result
            )
            return {"analysis": analysis_data(record), "reused": False}

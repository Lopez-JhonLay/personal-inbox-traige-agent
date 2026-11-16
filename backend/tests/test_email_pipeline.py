from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Email, EmailAnalysisRecord
from app.repositories import analysis_repository as analyses
from app.repositories import email_repository as emails
from app.repositories import gmail_connection_repository as connections
from app.repositories import operation_repository as operations
from app.repositories import user_repository as users
from app.schemas.email_schema import EmailQuery, PageQuery
from app.schemas.gmail_schema import NormalizedEmail
from app.services import email_service as service
from app.services.ai_service import AnalysisError
from app.services.integration_errors import IntegrationError

pytestmark = pytest.mark.database


@pytest.mark.parametrize("stage", ["sync", "analysis"])
def test_disconnect_during_provider_call_prevents_new_writes(pipeline, stage) -> None:
    p = pipeline
    if stage == "sync":
        original = service.get_message.side_effect

        def fetch(*args, **kwargs):
            connections.disconnect_connection(p.session, p.user.id)
            return original(*args, **kwargs)

        service.get_message.side_effect = fetch
        result = service.sync_emails(p.settings, p.database, p.user.id)
        assert result["imported"] == 0
        assert result["errors"][0]["code"] == "OPERATION_EXPIRED"
    else:
        service.sync_emails(p.settings, p.database, p.user.id)
        email_id = p.session.scalar(
            select(Email.id).where(Email.gmail_connection_id == p.connection.id)
        )
        result = service.analyze_email.return_value

        def analyze(*args, **kwargs):
            connections.disconnect_connection(p.session, p.user.id)
            return result

        service.analyze_email.side_effect = analyze
        with pytest.raises(IntegrationError, match="OPERATION_EXPIRED"):
            service.process_email(p.settings, p.database, p.user.id, email_id)
        assert analyses.latest_completed_analysis(p.session, p.user.id, email_id) is None


@pytest.fixture
def pipeline(db_session: Session, monkeypatch):
    @contextmanager
    def begin() -> Iterator[Session]:
        with db_session.begin_nested():
            yield db_session

    database = Mock()
    database.session_factory.begin.side_effect = begin
    user = users.create_user(db_session, email=f"phase5-{uuid4()}@example.invalid")
    connection = connections.save_connection(
        db_session,
        user.id,
        gmail_address=user.email,
        scopes=[],
        status="connected",
        encrypted_refresh_token="synthetic",
    )
    settings = Settings(
        _env_file=None, openrouter_api_key="synthetic", gmail_sync_query="label:mailkind-test"
    )
    monkeypatch.setattr(service, "credentials_for_user", Mock())
    client = Mock()
    monkeypatch.setattr(service, "create_gmail_client", Mock(return_value=client))
    monkeypatch.setattr(service, "list_message_ids", Mock(return_value=["one", "two"]))

    def fetch(client, message_id, **kwargs):
        return NormalizedEmail(
            gmail_message_id=message_id,
            gmail_thread_id=f"thread-{message_id}",
            sender="sender@example.invalid",
            subject="Synthetic request",
            body="Please review the fictional document.",
            received_at=datetime.now(UTC),
        )

    monkeypatch.setattr(service, "get_message", Mock(side_effect=fetch))
    result = {
        "analysis": {
            "summary": "Review the fictional document.",
            "category": "Work",
            "priority": "High",
            "deadline": None,
            "deadline_text": None,
            "requested_action": "Review document.",
            "suggested_action": None,
            "reply_needed": False,
            "draft_reply": None,
        },
        "model": "synthetic-model",
    }
    monkeypatch.setattr(service, "analyze_email", Mock(return_value=result))
    return SimpleNamespace(
        database=database,
        session=db_session,
        user=user,
        connection=connection,
        settings=settings,
        client=client,
    )


def test_sync_analysis_and_duplicate_prevention(pipeline) -> None:
    p = pipeline
    result = service.sync_emails(p.settings, p.database, p.user.id)
    assert result["imported"] == 2 and result["failed"] == 0
    service.list_message_ids.assert_called_once_with(
        p.client,
        limit=20,
        query="label:mailkind-test",
        deadline=service.list_message_ids.call_args.kwargs["deadline"],
    )
    for email_id in result["pending_email_ids"]:
        from uuid import UUID

        analyzed = service.process_email(p.settings, p.database, p.user.id, UUID(email_id))
        assert analyzed["analysis"]["model_identifier"] == "synthetic-model"
        assert analyzed["analysis"]["status"] == "completed"
    second = service.sync_emails(p.settings, p.database, p.user.id)
    assert second["imported"] == 0 and second["existing"] == 2
    assert second["pending_email_ids"] == []
    assert service.get_message.call_count == 2
    assert service.analyze_email.call_count == 2
    email_id = p.session.scalar(
        select(Email.id).where(Email.gmail_connection_id == p.connection.id)
    )
    assert service.process_email(p.settings, p.database, p.user.id, email_id)["reused"]
    assert service.analyze_email.call_count == 2


def test_failed_retry_history_and_filters(pipeline) -> None:
    p = pipeline
    service.sync_emails(p.settings, p.database, p.user.id)
    email_id = p.session.scalar(
        select(Email.id).where(Email.gmail_connection_id == p.connection.id)
    )
    result = service.analyze_email.return_value
    service.analyze_email.side_effect = AnalysisError("AI_RATE_LIMITED", "Try later.", 429, "10")
    with pytest.raises(AnalysisError):
        service.process_email(p.settings, p.database, p.user.id, email_id)
    assert service.email_detail(p.database, p.user.id, email_id)["analysis_status"] == "failed"
    service.analyze_email.side_effect = None
    service.analyze_email.return_value = result
    service.process_email(p.settings, p.database, p.user.id, email_id)
    assert (
        service.list_user_emails(
            p.database, p.user.id, EmailQuery(priority="High", category="Work")
        )["total"]
        == 1
    )
    assert service.list_user_emails(p.database, p.user.id, EmailQuery(priority="Low"))["total"] == 0
    history = service.analysis_history(p.database, p.user.id, email_id, PageQuery())
    assert [a["status"] for a in history["analyses"]] == ["completed", "failed"]
    assert service.list_user_emails(p.database, p.user.id, EmailQuery(limit=1, offset=1))["emails"]


def test_partial_import_and_budget(pipeline) -> None:
    p = pipeline
    original = service.get_message.side_effect

    def fetch(client, message_id, **kwargs):
        if message_id == "two":
            raise IntegrationError("GMAIL_MESSAGE_INVALID", "Unsupported.", 422)
        return original(client, message_id, **kwargs)

    service.get_message.side_effect = fetch
    result = service.sync_emails(p.settings, p.database, p.user.id)
    assert result["imported"] == 1 and result["failed"] == 1
    service.get_message.side_effect = IntegrationError("SYNC_TIME_BUDGET", "Paused.", 409)
    result = service.sync_emails(p.settings, p.database, p.user.id)
    assert result["existing"] == 1 and result["deferred"] == 1
    assert p.connection.operation_id is None


def test_operation_overlap_recovery_and_ownership(pipeline) -> None:
    p = pipeline
    first = operations.acquire_operation(p.session, p.user.id)
    with pytest.raises(IntegrationError, match="OPERATION_IN_PROGRESS"):
        operations.acquire_operation(p.session, p.user.id)
    email = emails.save_email(
        p.session,
        p.user.id,
        gmail_connection_id=p.connection.id,
        gmail_message_id="stale",
        gmail_thread_id="thread",
    )
    record = analyses.create_analysis(p.session, p.user.id, email.id, model_identifier="synthetic")
    record.status = "processing"
    p.connection.operation_expires_at = datetime.now(UTC) - timedelta(minutes=1)
    p.session.flush()
    second = operations.acquire_operation(p.session, p.user.id)
    operations.release_operation(p.session, p.user.id, first)
    assert p.connection.operation_id == second
    p.session.refresh(record)
    assert record.status == "failed" and record.error_code == "PROCESSING_INTERRUPTED"
    with pytest.raises(IntegrationError, match="OPERATION_EXPIRED"):
        operations.require_operation(p.session, p.user.id, first)
    connections.disconnect_connection(p.session, p.user.id)
    with pytest.raises(IntegrationError, match="OPERATION_EXPIRED"):
        operations.require_operation(p.session, p.user.id, second)


def test_active_analysis_constraint_and_cross_user(pipeline) -> None:
    p = pipeline
    service.sync_emails(p.settings, p.database, p.user.id)
    email_id = p.session.scalar(
        select(Email.id).where(Email.gmail_connection_id == p.connection.id)
    )
    with pytest.raises(IntegrityError), p.session.begin_nested():
        analyses.create_analysis(p.session, p.user.id, email_id, model_identifier="duplicate")
    other = users.create_user(p.session, email=f"other-{uuid4()}@example.invalid")
    connections.save_connection(
        p.session, other.id, gmail_address=other.email, scopes=[], status="connected"
    )
    assert service.list_user_emails(p.database, other.id, EmailQuery())["total"] == 0
    with pytest.raises(IntegrationError, match="EMAIL_NOT_FOUND"):
        service.email_detail(p.database, other.id, email_id)
    with pytest.raises(IntegrationError, match="EMAIL_NOT_FOUND"):
        service.analysis_history(p.database, other.id, email_id, PageQuery())
    with pytest.raises(IntegrationError, match="EMAIL_NOT_FOUND"):
        service.process_email(p.settings, p.database, other.id, email_id)
    service.analyze_email.assert_not_called()


def test_blank_body_and_failed_forced_reanalysis_preserves_success(pipeline) -> None:
    p = pipeline
    service.sync_emails(p.settings, p.database, p.user.id)
    email = p.session.scalar(select(Email).where(Email.gmail_connection_id == p.connection.id))
    body = email.body
    email.body = " "
    p.session.flush()
    with pytest.raises(AnalysisError, match="EMAIL_INPUT_INVALID"):
        service.process_email(p.settings, p.database, p.user.id, email.id)
    service.analyze_email.assert_not_called()
    email.body = body
    p.session.flush()
    service.process_email(p.settings, p.database, p.user.id, email.id)
    service.analyze_email.side_effect = AnalysisError("AI_INVALID_OUTPUT", "Invalid.", 502)
    with pytest.raises(AnalysisError):
        service.process_email(p.settings, p.database, p.user.id, email.id, force=True)
    detail = service.email_detail(p.database, p.user.id, email.id)
    assert detail["analysis_status"] == "failed"
    assert detail["latest_completed_analysis"]["summary"] == "Review the fictional document."
    assert (
        p.session.scalar(
            select(func.count())
            .select_from(EmailAnalysisRecord)
            .where(EmailAnalysisRecord.email_id == email.id)
        )
        == 3
    )

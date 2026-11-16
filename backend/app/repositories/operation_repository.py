from uuid import UUID, uuid4

from sqlalchemy import func, or_, select, text, update
from sqlalchemy.orm import Session

from app.models import Email, EmailAnalysisRecord, GmailConnection
from app.services.integration_errors import IntegrationError


def acquire_operation(session: Session, user_id: UUID) -> UUID:
    operation_id = uuid4()
    acquired = session.scalar(
        update(GmailConnection)
        .where(
            GmailConnection.user_id == user_id,
            GmailConnection.status == "connected",
            or_(
                GmailConnection.operation_id.is_(None),
                GmailConnection.operation_expires_at <= func.clock_timestamp(),
            ),
        )
        .values(
            operation_id=operation_id,
            operation_expires_at=func.clock_timestamp() + text("interval '2 minutes'"),
        )
        .returning(GmailConnection.id)
    )
    if acquired is None:
        connection = session.scalar(
            select(GmailConnection).where(GmailConnection.user_id == user_id)
        )
        if connection is None or connection.status != "connected":
            raise IntegrationError("GMAIL_REAUTH_REQUIRED", "Reconnect Gmail to continue.", 401)
        raise IntegrationError(
            "OPERATION_IN_PROGRESS", "Another operation is running. Try again shortly.", 409
        )
    # A previous processing attempt without a live lease was interrupted.
    session.execute(
        update(EmailAnalysisRecord)
        .where(
            EmailAnalysisRecord.email_id.in_(
                select(Email.id).where(Email.gmail_connection_id == acquired)
            ),
            EmailAnalysisRecord.status == "processing",
        )
        .values(status="failed", error_code="PROCESSING_INTERRUPTED")
    )
    return operation_id


def require_operation(session: Session, user_id: UUID, operation_id: UUID) -> GmailConnection:
    # Serialize each write with disconnect, while never holding this lock over network calls.
    connection = session.scalar(
        select(GmailConnection)
        .where(
            GmailConnection.user_id == user_id,
            GmailConnection.status == "connected",
            GmailConnection.operation_id == operation_id,
            GmailConnection.operation_expires_at > func.clock_timestamp(),
        )
        .with_for_update()
    )
    if connection is None:
        raise IntegrationError(
            "OPERATION_EXPIRED", "Processing stopped. Reload and try again.", 409
        )
    return connection


def release_operation(session: Session, user_id: UUID, operation_id: UUID) -> None:
    session.execute(
        update(GmailConnection)
        .where(
            GmailConnection.user_id == user_id,
            GmailConnection.operation_id == operation_id,
        )
        .values(operation_id=None, operation_expires_at=None)
    )

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Email, EmailAnalysisRecord, GmailConnection
from app.models.email_analysis import ANALYSIS_STATUSES
from app.repositories.email_repository import require_email
from app.schemas.analysis_schema import EmailAnalysis


def get_analysis(session: Session, user_id: UUID, analysis_id: UUID) -> EmailAnalysisRecord | None:
    return session.scalar(
        select(EmailAnalysisRecord)
        .join(Email)
        .join(GmailConnection)
        .where(EmailAnalysisRecord.id == analysis_id, GmailConnection.user_id == user_id)
    )


def create_analysis(
    session: Session, user_id: UUID, email_id: UUID, *, model_identifier: str
) -> EmailAnalysisRecord:
    require_email(session, user_id, email_id)
    record = EmailAnalysisRecord(
        email_id=email_id, model_identifier=model_identifier, created_at=datetime.now(UTC)
    )
    session.add(record)
    session.flush()
    return record


def update_analysis(
    session: Session,
    user_id: UUID,
    analysis_id: UUID,
    *,
    status: str,
    result: EmailAnalysis | None = None,
    error_code: str | None = None,
) -> EmailAnalysisRecord | None:
    if status not in ANALYSIS_STATUSES:
        raise ValueError("Invalid analysis status.")
    if (status == "completed") != (result is not None):
        raise ValueError("Only completed analyses require a validated result.")
    if error_code is not None and status != "failed":
        raise ValueError("Only failed analyses accept an error code.")
    record = get_analysis(session, user_id, analysis_id)
    if record is None:
        return None
    if record.status in {"completed", "failed"}:
        raise ValueError("Create a new attempt to reanalyze an email.")
    if result is not None:
        for key, value in result.model_dump().items():
            setattr(record, key, value)
    record.status = status
    record.error_code = error_code
    session.flush()
    return record


def latest_completed_analysis(
    session: Session, user_id: UUID, email_id: UUID
) -> EmailAnalysisRecord | None:
    return session.scalar(
        select(EmailAnalysisRecord)
        .join(Email)
        .join(GmailConnection)
        .where(
            GmailConnection.user_id == user_id,
            EmailAnalysisRecord.email_id == email_id,
            EmailAnalysisRecord.status == "completed",
        )
        .order_by(EmailAnalysisRecord.created_at.desc(), EmailAnalysisRecord.id.desc())
        .limit(1)
    )

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models import Email, EmailAnalysisRecord, GmailConnection
from app.schemas.email_schema import EmailQuery


def latest_attempt(session: Session, email_id: UUID) -> EmailAnalysisRecord | None:
    """Internal helper; callers must first verify email ownership."""
    return session.scalar(
        select(EmailAnalysisRecord)
        .where(EmailAnalysisRecord.email_id == email_id)
        .order_by(EmailAnalysisRecord.created_at.desc(), EmailAnalysisRecord.id.desc())
        .limit(1)
    )


def email_page(session: Session, user_id: UUID, query: EmailQuery) -> tuple[list, int]:
    current = aliased(EmailAnalysisRecord)
    completed = aliased(EmailAnalysisRecord)

    def latest_id(success_only: bool):
        statement = select(EmailAnalysisRecord.id).where(EmailAnalysisRecord.email_id == Email.id)
        if success_only:
            statement = statement.where(EmailAnalysisRecord.status == "completed")
        return (
            statement.order_by(EmailAnalysisRecord.created_at.desc(), EmailAnalysisRecord.id.desc())
            .limit(1)
            .correlate(Email)
            .scalar_subquery()
        )

    status = func.coalesce(current.status, "pending")
    statement = (
        select(Email, status.label("analysis_status"), completed)
        .join(GmailConnection)
        .outerjoin(current, current.id == latest_id(False))
        .outerjoin(completed, completed.id == latest_id(True))
        .where(GmailConnection.user_id == user_id)
    )
    if query.priority:
        statement = statement.where(completed.priority == query.priority)
    if query.category:
        statement = statement.where(completed.category == query.category)
    if query.analysis_status:
        statement = statement.where(status == query.analysis_status)
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    rows = session.execute(
        statement.order_by(Email.received_at.desc().nulls_last(), Email.id.desc())
        .offset(query.offset)
        .limit(query.limit)
    ).all()
    return list(rows), total or 0


def history_page(
    session: Session, email_id: UUID, *, limit: int, offset: int
) -> tuple[list[EmailAnalysisRecord], int]:
    statement = select(EmailAnalysisRecord).where(EmailAnalysisRecord.email_id == email_id)
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    records = list(
        session.scalars(
            statement.order_by(EmailAnalysisRecord.created_at.desc(), EmailAnalysisRecord.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return records, total or 0

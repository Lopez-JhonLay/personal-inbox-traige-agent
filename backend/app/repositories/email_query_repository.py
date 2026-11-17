from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, aliased

from app.models import ActionItem, Email, EmailAnalysisRecord, GmailConnection
from app.repositories.action_repository import owned_actions
from app.schemas.email_schema import EmailQuery


def latest_attempt(session: Session, email_id: UUID) -> EmailAnalysisRecord | None:
    """Internal helper; callers must first verify email ownership."""
    return session.scalar(
        select(EmailAnalysisRecord)
        .where(EmailAnalysisRecord.email_id == email_id)
        .order_by(EmailAnalysisRecord.created_at.desc(), EmailAnalysisRecord.id.desc())
        .limit(1)
    )


def email_statement(user_id: UUID):
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
    return statement, status, completed


def email_page(session: Session, user_id: UUID, query: EmailQuery) -> tuple[list, int]:
    statement, status, completed = email_statement(user_id)
    if query.priority:
        statement = statement.where(completed.priority == query.priority)
    if query.category:
        statement = statement.where(completed.category == query.category)
    if query.analysis_status:
        statement = statement.where(status == query.analysis_status)
    if query.reply_needed is not None:
        statement = statement.where(completed.reply_needed == query.reply_needed)
    if query.has_pending_action is not None:
        pending = (
            select(ActionItem.id)
            .where(
                ActionItem.email_id == Email.id,
                ActionItem.user_id == user_id,
                ActionItem.status == "pending",
            )
            .exists()
        )
        statement = statement.where(pending if query.has_pending_action else ~pending)
    total = session.scalar(select(func.count()).select_from(statement.subquery()))
    order = [Email.received_at.desc().nulls_last(), Email.id.desc()]
    if query.sort == "received_asc":
        order = [Email.received_at.asc().nulls_last(), Email.id.asc()]
    elif query.sort == "priority_desc":
        order.insert(
            0,
            case(
                (completed.priority == "High", 0),
                (completed.priority == "Medium", 1),
                (completed.priority == "Low", 2),
                else_=3,
            ),
        )
    rows = session.execute(statement.order_by(*order).offset(query.offset).limit(query.limit)).all()
    return list(rows), total or 0


def overview_counts(session: Session, user_id: UUID) -> dict[str, int]:
    statement, _, completed = email_statement(user_id)
    statement = statement.with_only_columns(
        func.count(completed.id).label("analyzed_count"),
        func.count().filter(completed.priority == "High").label("high_priority_count"),
        func.count().filter(completed.reply_needed.is_(True)).label("reply_needed_count"),
    )
    counts = dict(session.execute(statement).mappings().one())
    actions = owned_actions(user_id).where(ActionItem.status == "pending")
    counts["pending_action_count"] = (
        session.scalar(select(func.count()).select_from(actions.subquery())) or 0
    )
    return counts


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

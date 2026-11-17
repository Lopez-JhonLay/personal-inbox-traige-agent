from datetime import date
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import ActionItem, Email, GmailConnection
from app.models.action_item import ACTION_STATUSES
from app.repositories.email_repository import owned_emails, require_email
from app.schemas.action_schema import ActionQuery


def owned_actions(user_id: UUID) -> Select[tuple[ActionItem]]:
    return (
        select(ActionItem)
        .join(Email)
        .join(GmailConnection)
        .where(ActionItem.user_id == user_id, GmailConnection.user_id == user_id)
    )


def create_action(
    session: Session,
    user_id: UUID,
    email_id: UUID,
    *,
    description: str,
    due_date: date | None = None,
) -> ActionItem:
    require_email(session, user_id, email_id)
    if not description.strip():
        raise ValueError("Action description cannot be blank.")
    action = ActionItem(
        user_id=user_id, email_id=email_id, description=description, due_date=due_date
    )
    session.add(action)
    session.flush()
    return action


def list_actions(session: Session, user_id: UUID, *, status: str | None = None) -> list[ActionItem]:
    query = owned_actions(user_id)
    if status is not None:
        if status not in ACTION_STATUSES:
            raise ValueError("Invalid action status.")
        query = query.where(ActionItem.status == status)
    return list(
        session.scalars(
            query.order_by(
                ActionItem.due_date.asc().nulls_last(), ActionItem.created_at, ActionItem.id
            )
        )
    )


def update_action_status(
    session: Session, user_id: UUID, action_id: UUID, *, status: str
) -> ActionItem | None:
    if status not in ACTION_STATUSES:
        raise ValueError("Invalid action status.")
    action = session.scalar(owned_actions(user_id).where(ActionItem.id == action_id))
    if action is not None:
        action.status = status
        session.flush()
    return action


def create_or_reuse_action(
    session: Session,
    user_id: UUID,
    email_id: UUID,
    *,
    description: str,
    due_date: date | None = None,
) -> tuple[ActionItem, bool]:
    # Lock the parent even when no action exists, so concurrent retries serialize.
    email = session.scalar(
        owned_emails(user_id).where(Email.id == email_id).with_for_update(of=Email)
    )
    if email is None:
        raise LookupError("Email not found.")
    description = description.strip()
    existing = session.scalar(
        owned_actions(user_id)
        .where(
            ActionItem.email_id == email_id,
            ActionItem.description == description,
            ActionItem.due_date == due_date,
        )
        .order_by(ActionItem.created_at, ActionItem.id)
        .limit(1)
    )
    if existing is not None:
        return existing, True
    return create_action(
        session, user_id, email_id, description=description, due_date=due_date
    ), False


def action_page(
    session: Session, user_id: UUID, query: ActionQuery
) -> tuple[list[ActionItem], int]:
    statement = owned_actions(user_id)
    if query.status is not None:
        statement = statement.where(ActionItem.status == query.status)
    if query.email_id is not None:
        statement = statement.where(ActionItem.email_id == query.email_id)
    total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    records = list(
        session.scalars(
            statement.options(joinedload(ActionItem.email))
            .order_by(ActionItem.due_date.asc().nulls_last(), ActionItem.created_at, ActionItem.id)
            .offset(query.offset)
            .limit(query.limit)
        )
    )
    return records, total


def first_email_action(session: Session, user_id: UUID, email_id: UUID) -> ActionItem | None:
    return session.scalar(
        owned_actions(user_id)
        .where(ActionItem.email_id == email_id)
        .order_by(ActionItem.created_at, ActionItem.id)
        .limit(1)
    )


def create_automatic_action(
    session: Session,
    user_id: UUID,
    email_id: UUID,
    *,
    description: str,
    due_date: date | None = None,
) -> tuple[ActionItem, bool]:
    # Share the manual-creation lock, but preserve ANY task already associated with the email.
    email = session.scalar(
        owned_emails(user_id).where(Email.id == email_id).with_for_update(of=Email)
    )
    if email is None:
        raise LookupError("Email not found.")
    existing = first_email_action(session, user_id, email_id)
    if existing is not None:
        return existing, True
    return create_action(
        session, user_id, email_id, description=description.strip(), due_date=due_date
    ), False

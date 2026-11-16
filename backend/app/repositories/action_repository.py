from datetime import date
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models import ActionItem, Email, GmailConnection
from app.models.action_item import ACTION_STATUSES
from app.repositories.email_repository import require_email


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

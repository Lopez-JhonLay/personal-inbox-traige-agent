from uuid import UUID

from app.database import Database
from app.models import ActionItem
from app.repositories import action_repository as actions
from app.schemas.action_schema import ActionQuery, CreateActionRequest, UpdateActionRequest
from app.services.integration_errors import IntegrationError


def action_data(action: ActionItem) -> dict:
    return {
        "id": str(action.id),
        "email_id": str(action.email_id),
        "description": action.description,
        "due_date": action.due_date.isoformat() if action.due_date else None,
        "status": action.status,
        "created_at": action.created_at.isoformat(),
        "updated_at": action.updated_at.isoformat(),
        "email_subject": action.email.subject,
        "email_sender": action.email.sender,
    }


def create_action(database: Database, user_id: UUID, payload: CreateActionRequest) -> dict:
    with database.session_factory.begin() as session:
        try:
            action, reused = actions.create_or_reuse_action(
                session, user_id, **payload.model_dump()
            )
        except LookupError:
            raise IntegrationError("EMAIL_NOT_FOUND", "Email not found.", 404) from None
        return {"action": action_data(action), "reused": reused}


def list_actions(database: Database, user_id: UUID, query: ActionQuery) -> dict:
    with database.session_factory.begin() as session:
        records, total = actions.action_page(session, user_id, query)
        return {
            "actions": [action_data(action) for action in records],
            "total": total,
            "limit": query.limit,
            "offset": query.offset,
        }


def update_action(
    database: Database, user_id: UUID, action_id: UUID, payload: UpdateActionRequest
) -> dict:
    with database.session_factory.begin() as session:
        action = actions.update_action_status(session, user_id, action_id, status=payload.status)
        if action is None:
            raise IntegrationError("ACTION_NOT_FOUND", "Action not found.", 404)
        return action_data(action)

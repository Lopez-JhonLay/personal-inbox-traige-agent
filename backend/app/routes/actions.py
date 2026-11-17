from uuid import UUID

from flask import Blueprint, Response, current_app, g, jsonify, request
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.schemas.action_schema import ActionQuery, CreateActionRequest, UpdateActionRequest
from app.services import action_service, email_service
from app.services.integration_errors import IntegrationError
from app.utils.auth_session import require_csrf, require_user_id

actions_bp = Blueprint("actions", __name__)


@actions_bp.before_request
def authenticate() -> None:
    request.max_content_length = 16384
    g.action_user_id = require_user_id()
    database = current_app.extensions["database"]
    if database is None:
        raise IntegrationError("DATABASE_UNAVAILABLE", "Action storage is unavailable.", 503)
    email_service.require_user(database, g.action_user_id)
    if request.method in {"POST", "PATCH"}:
        require_csrf()


@actions_bp.after_request
def private_response(response: Response) -> Response:
    response.headers["Cache-Control"] = "no-store"
    return response


@actions_bp.errorhandler(ValidationError)
def invalid_request(error: ValidationError) -> tuple[Response, int]:
    return jsonify(
        success=False, error={"code": "INVALID_REQUEST", "message": "Invalid action request."}
    ), 400


@actions_bp.errorhandler(SQLAlchemyError)
def database_error(error: SQLAlchemyError) -> tuple[Response, int]:
    return jsonify(
        success=False,
        error={
            "code": "DATABASE_UNAVAILABLE",
            "message": "Action storage is unavailable. Try again.",
        },
    ), 503


@actions_bp.get("")
def list_actions() -> Response:
    query = ActionQuery.model_validate(request.args.to_dict())
    return jsonify(
        success=True,
        data=action_service.list_actions(
            current_app.extensions["database"], g.action_user_id, query
        ),
    )


@actions_bp.post("")
def create_action() -> tuple[Response, int]:
    payload = CreateActionRequest.model_validate(request.get_json())
    data = action_service.create_action(
        current_app.extensions["database"], g.action_user_id, payload
    )
    return jsonify(success=True, data=data), 200 if data["reused"] else 201


@actions_bp.patch("/<uuid:action_id>")
def update_action(action_id: UUID) -> Response:
    payload = UpdateActionRequest.model_validate(request.get_json())
    return jsonify(
        success=True,
        data=action_service.update_action(
            current_app.extensions["database"], g.action_user_id, action_id, payload
        ),
    )

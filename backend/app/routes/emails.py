from uuid import UUID

from flask import Blueprint, Response, current_app, g, jsonify, request
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.schemas.email_schema import AnalyzeRequest, EmailQuery, PageQuery
from app.services import email_service
from app.services.ai_service import AnalysisError
from app.services.integration_errors import IntegrationError
from app.utils.auth_session import require_csrf, require_user_id

emails_bp = Blueprint("emails", __name__)


@emails_bp.before_request
def authenticate() -> None:
    request.max_content_length = 4096
    g.email_user_id = require_user_id()
    database = current_app.extensions["database"]
    if database is None:
        raise IntegrationError("DATABASE_UNAVAILABLE", "Email storage is unavailable.")
    email_service.require_user(database, g.email_user_id)
    if request.method == "POST":
        require_csrf()


@emails_bp.after_request
def private_response(response: Response) -> Response:
    response.headers["Cache-Control"] = "no-store"
    return response


@emails_bp.errorhandler(ValidationError)
def invalid_request(error: ValidationError) -> tuple[Response, int]:
    return jsonify(
        success=False, error={"code": "INVALID_REQUEST", "message": "Invalid email request."}
    ), 400


@emails_bp.errorhandler(SQLAlchemyError)
def database_error(error: SQLAlchemyError) -> tuple[Response, int]:
    return jsonify(
        success=False,
        error={
            "code": "DATABASE_UNAVAILABLE",
            "message": "Email storage is unavailable. Try again.",
        },
    ), 503


@emails_bp.errorhandler(AnalysisError)
def analysis_error(error: AnalysisError) -> Response:
    response = jsonify(success=False, error={"code": error.code, "message": error.message})
    response.status_code = error.status
    if error.retry_after:
        response.headers["Retry-After"] = error.retry_after
    return response


@emails_bp.post("/sync")
def sync() -> Response:
    if request.content_length:
        AnalyzeRequest.model_validate(request.get_json())
        if request.get_json():
            raise IntegrationError(
                "INVALID_REQUEST", "Sync does not accept request parameters.", 400
            )
    return jsonify(
        success=True,
        data=email_service.sync_emails(
            current_app.extensions["settings"], current_app.extensions["database"], g.email_user_id
        ),
    )


@emails_bp.get("")
def list_emails() -> Response:
    query = EmailQuery.model_validate(request.args.to_dict())
    return jsonify(
        success=True,
        data=email_service.list_user_emails(
            current_app.extensions["database"], g.email_user_id, query
        ),
    )


@emails_bp.get("/overview")
def overview() -> Response:
    return jsonify(
        success=True,
        data=email_service.user_overview(current_app.extensions["database"], g.email_user_id),
    )


@emails_bp.get("/<uuid:email_id>")
def detail(email_id: UUID) -> Response:
    return jsonify(
        success=True,
        data=email_service.email_detail(
            current_app.extensions["database"], g.email_user_id, email_id
        ),
    )


@emails_bp.get("/<uuid:email_id>/analyses")
def history(email_id: UUID) -> Response:
    query = PageQuery.model_validate(request.args.to_dict())
    return jsonify(
        success=True,
        data=email_service.analysis_history(
            current_app.extensions["database"], g.email_user_id, email_id, query
        ),
    )


@emails_bp.post("/<uuid:email_id>/analyze")
def analyze(email_id: UUID) -> Response:
    payload = AnalyzeRequest.model_validate(request.get_json() if request.content_length else {})
    return jsonify(
        success=True,
        data=email_service.process_email(
            current_app.extensions["settings"],
            current_app.extensions["database"],
            g.email_user_id,
            email_id,
            force=payload.force,
        ),
    )

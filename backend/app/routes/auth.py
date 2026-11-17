import secrets
import time
from urllib.parse import urlencode

from flask import Blueprint, Response, current_app, jsonify, redirect, request, session
from sqlalchemy.exc import SQLAlchemyError

from app.config import Settings
from app.database import Database
from app.schemas.gmail_schema import ConnectionStatus, GoogleProfile
from app.services import auth_service
from app.services.integration_errors import IntegrationError
from app.utils.auth_session import current_user_id, require_csrf, require_user_id

auth_bp = Blueprint("auth", __name__)


def auth_dependencies() -> tuple[Settings, Database]:
    settings = current_app.extensions["settings"]
    if not auth_service.auth_configured(settings):
        raise IntegrationError("AUTH_NOT_CONFIGURED", "Gmail connection is not configured.")
    return settings, current_app.extensions["database"]


@auth_bp.after_request
def private_response(response: Response) -> Response:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@auth_bp.get("/google")
def start_google() -> Response:
    settings, _ = auth_dependencies()
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    session["oauth"] = {"state": state, "verifier": verifier, "issued_at": time.time()}
    flow = auth_service.create_google_oauth_flow(settings, state=state, code_verifier=verifier)
    prompt = "select_account consent" if request.args.get("reconnect") == "1" else "select_account"
    url, _ = flow.authorization_url(access_type="offline", prompt=prompt, state=state)
    return redirect(url)


@auth_bp.get("/google/callback")
def google_callback() -> Response:
    settings = current_app.extensions["settings"]
    outcome = "connected"
    pending = session.pop("oauth", None) if settings.secret_key else None
    state = request.args.get("state", "")
    try:
        settings, database = auth_dependencies()
        if (
            not isinstance(pending, dict)
            or not state
            or len(state) > 256
            or not secrets.compare_digest(pending.get("state", "").encode(), state.encode())
            or not 0 <= time.time() - pending.get("issued_at", 0) <= 600
        ):
            raise IntegrationError(
                "OAUTH_STATE_INVALID", "Authorization expired. Please try again.", 400
            )
        if request.args.get("error"):
            raise IntegrationError("OAUTH_DENIED", "Gmail connection was cancelled.", 400)
        code = request.args.get("code")
        if not code:
            raise IntegrationError("OAUTH_CODE_MISSING", "Authorization code is missing.", 400)
        account = auth_service.finish_authorization(
            settings,
            database,
            code=code,
            state=state,
            code_verifier=pending["verifier"],
            expected_user_id=current_user_id(),
        )
        session.clear()
        session.permanent = True
        session["user_id"] = str(account.user_id)
        session["csrf_token"] = secrets.token_urlsafe(32)
        if account.profile is not None:
            session["google_profile"] = account.profile.model_dump(exclude_none=True)
    except IntegrationError as error:
        outcome = error.code
        current_app.logger.warning("Google authorization failed: %s", error.code)
    except SQLAlchemyError:
        outcome = "DATABASE_UNAVAILABLE"
    base = settings.frontend_url.rstrip("/")
    if outcome == "connected":
        return redirect(f"{base}/dashboard")
    return redirect(f"{base}/?{urlencode({'gmail': outcome})}#gmail-connection")


@auth_bp.get("/status")
def status() -> Response:
    settings = current_app.extensions["settings"]
    configured = auth_service.auth_configured(settings)
    result = ConnectionStatus(configured=configured)
    if configured:
        user_id = current_user_id()
        if user_id is not None:
            try:
                result = auth_service.connection_status(current_app.extensions["database"], user_id)
                if not result.authenticated:
                    session.clear()
            except SQLAlchemyError:
                raise IntegrationError(
                    "DATABASE_UNAVAILABLE", "Connection status is unavailable."
                ) from None
        if result.authenticated:
            try:
                profile = GoogleProfile.model_validate(session.get("google_profile", {}))
                result.display_name = profile.name
                result.picture_url = profile.picture
            except ValueError:
                pass
            result.sync_query = settings.gmail_sync_query
            if "csrf_token" not in session:
                session["csrf_token"] = secrets.token_urlsafe(32)
            result.csrf_token = session["csrf_token"]
    return jsonify(success=True, data=result.model_dump(mode="json"))


@auth_bp.post("/disconnect")
def disconnect() -> Response:
    settings, database = auth_dependencies()
    user_id = require_user_id()
    require_csrf()
    try:
        if not auth_service.connection_status(database, user_id).authenticated:
            raise IntegrationError("AUTH_REQUIRED", "Connect Gmail to continue.", 401)
        revoked = auth_service.disconnect_gmail(settings, database, user_id)
    except SQLAlchemyError:
        raise IntegrationError(
            "DATABASE_UNAVAILABLE", "Disconnect could not be saved. Try again."
        ) from None
    session.clear()
    return jsonify(success=True, data={"disconnected": True, "revoked": revoked})


@auth_bp.post("/logout")
def logout() -> Response:
    # Logging out only removes this browser's session; no provider/database access is needed.
    require_user_id()
    require_csrf()
    session.clear()
    return jsonify(success=True, data={"logged_out": True})

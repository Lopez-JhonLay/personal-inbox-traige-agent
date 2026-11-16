from secrets import compare_digest
from uuid import UUID

from flask import request, session

from app.services.integration_errors import IntegrationError


def current_user_id() -> UUID | None:
    try:
        return UUID(session["user_id"])
    except KeyError, ValueError, TypeError, AttributeError:
        return None


def require_user_id() -> UUID:
    user_id = current_user_id()
    if user_id is None:
        raise IntegrationError("AUTH_REQUIRED", "Connect Gmail to continue.", 401)
    return user_id


def require_csrf() -> None:
    expected = session.get("csrf_token")
    supplied = request.headers.get("X-CSRF-Token", "")
    if (
        not isinstance(expected, str)
        or not supplied
        or len(supplied) > 256
        or not compare_digest(expected.encode(), supplied.encode())
    ):
        raise IntegrationError("CSRF_INVALID", "Reload the page and try again.", 403)

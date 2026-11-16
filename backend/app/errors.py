from http import HTTPStatus

from flask import current_app
from werkzeug.exceptions import HTTPException
from werkzeug.wrappers import Response


def handle_http_error(error: HTTPException) -> Response:
    # Retain protocol headers such as Allow, Retry-After, and WWW-Authenticate.
    response = error.get_response()
    try:
        status = HTTPStatus(response.status_code)
        code = status.name
        message = status.phrase
    except ValueError:
        code = f"HTTP_{response.status_code}"
        message = "The request could not be completed."

    if response.status_code >= 500:
        message = "The server could not complete the request."

    # Custom exception descriptions can contain private request/provider details.
    response.set_data(
        current_app.json.dumps({"success": False, "error": {"code": code, "message": message}})
    )
    response.content_type = "application/json"
    return response

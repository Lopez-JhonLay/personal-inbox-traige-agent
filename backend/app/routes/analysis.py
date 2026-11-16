from flask import Blueprint, Response, current_app, jsonify, request
from pydantic import ValidationError
from werkzeug.exceptions import BadRequest

from app.schemas.analysis_schema import EmailInput
from app.services.ai_service import AnalysisError, analyze_email

analysis_bp = Blueprint("dev_analysis", __name__)


@analysis_bp.post("/dev/analyze")
def analyze_sample() -> tuple[Response, int] | Response:
    request.max_content_length = 128 * 1024
    # Let Flask preserve its standard malformed-JSON and unsupported-media errors.
    request.get_json()
    try:
        email = EmailInput.model_validate_json(request.get_data())
    except ValidationError:
        raise BadRequest() from None
    try:
        result = analyze_email(email, current_app.extensions["settings"])
    except AnalysisError as error:
        response = jsonify(success=False, error={"code": error.code, "message": error.message})
        response.status_code = error.status
        if error.retry_after:
            response.headers["Retry-After"] = error.retry_after
        return response
    return jsonify(success=True, data=result)

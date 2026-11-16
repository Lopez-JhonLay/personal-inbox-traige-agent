from flask import Blueprint, Response, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health() -> Response:
    # Liveness only; does not contact Google, OpenRouter, or Neon.
    return jsonify(success=True, data={"status": "ok"})

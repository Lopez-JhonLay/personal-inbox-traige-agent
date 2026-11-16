import logging

import pytest
from flask import Flask, Response, abort, jsonify, request
from werkzeug.exceptions import ServiceUnavailable

from app import create_app
from app.config import Settings


@pytest.fixture
def app() -> Flask:
    app = create_app(
        Settings(_env_file=None, database_url=None, frontend_url="http://localhost:5173")
    )
    app.config.update(TESTING=True)
    return app


def test_missing_route_returns_json(app: Flask) -> None:
    response = app.test_client().get("/api/missing")

    assert response.status_code == 404
    assert response.content_type == "application/json"
    assert response.json == {
        "success": False,
        "error": {"code": "NOT_FOUND", "message": "Not Found"},
    }


def test_method_not_allowed_preserves_allowed_methods(app: Flask) -> None:
    response = app.test_client().post("/api/health")

    assert response.status_code == 405
    assert response.json == {
        "success": False,
        "error": {"code": "METHOD_NOT_ALLOWED", "message": "Method Not Allowed"},
    }
    assert {"GET", "HEAD", "OPTIONS"} <= set(response.allow)


def test_malformed_json_returns_bad_request(app: Flask) -> None:
    @app.post("/api/test-json")
    def parse_json() -> Response:
        return jsonify(request.get_json())

    response = app.test_client().post(
        "/api/test-json", data='{"incomplete":', content_type="application/json"
    )

    assert response.status_code == 400
    assert response.json == {
        "success": False,
        "error": {"code": "BAD_REQUEST", "message": "Bad Request"},
    }


def test_http_error_redacts_description_and_preserves_retry_after(app: Flask) -> None:
    @app.get("/api/test-unavailable")
    def unavailable() -> None:
        raise ServiceUnavailable(description="private provider details", retry_after=30)

    response = app.test_client().get("/api/test-unavailable")

    assert response.status_code == 503
    assert response.headers["Retry-After"] == "30"
    assert response.json == {
        "success": False,
        "error": {
            "code": "SERVICE_UNAVAILABLE",
            "message": "The server could not complete the request.",
        },
    }


def test_unhandled_exception_returns_safe_json_and_is_logged(
    app: Flask, caplog: pytest.LogCaptureFixture
) -> None:
    app.config.update(PROPAGATE_EXCEPTIONS=False, DEBUG=False)

    @app.get("/api/test-failure")
    def fail() -> None:
        raise RuntimeError("private failure details")

    with caplog.at_level(logging.ERROR):
        response = app.test_client().get("/api/test-failure")

    assert response.status_code == 500
    assert response.json == {
        "success": False,
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "The server could not complete the request.",
        },
    }
    assert any(record.exc_info for record in caplog.records)


def test_error_response_keeps_cors_headers(app: Flask) -> None:
    response = app.test_client().get("/api/missing", headers={"Origin": "http://localhost:5173"})

    assert response.status_code == 404
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert response.headers["Access-Control-Allow-Credentials"] == "true"


def test_client_error_does_not_echo_custom_description(app: Flask) -> None:
    @app.get("/api/test-rejected")
    def reject() -> None:
        abort(400, description="private request details")

    response = app.test_client().get("/api/test-rejected")

    assert response.status_code == 400
    assert response.json == {
        "success": False,
        "error": {"code": "BAD_REQUEST", "message": "Bad Request"},
    }

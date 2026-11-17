from unittest.mock import Mock
from uuid import uuid4

import pytest

from app import create_app
from app.config import Settings
from app.schemas.email_schema import AnalyzeRequest, EmailQuery
from app.services import email_service as service
from app.services.ai_service import AnalysisError
from app.services.integration_errors import IntegrationError
from app.utils.deadline import remaining_time


@pytest.fixture
def email_client(monkeypatch):
    app = create_app(
        Settings(_env_file=None, secret_key="test", database_url="postgresql://u:p@localhost/test")
    )
    app.config["TESTING"] = True
    monkeypatch.setattr(service, "require_user", Mock())
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = str(uuid4())
        session["csrf_token"] = "csrf"
    return client


def test_auth_and_csrf(email_client, monkeypatch) -> None:
    sync = Mock()
    monkeypatch.setattr(service, "sync_emails", sync)
    assert email_client.post("/api/emails/sync").status_code == 403
    with email_client.session_transaction() as session:
        session.clear()
    assert email_client.get("/api/emails").status_code == 401
    sync.assert_not_called()


def test_large_request_is_rejected(email_client) -> None:
    response = email_client.post(
        "/api/emails/sync",
        data='{"extra":"' + "x" * 5000 + '"}',
        content_type="application/json",
        headers={"X-CSRF-Token": "csrf"},
    )
    assert response.status_code == 413


@pytest.mark.parametrize(
    "query",
    [
        "limit=0",
        "limit=101",
        "offset=-1",
        "priority=urgent",
        "category=invalid",
        "analysis_status=unknown",
        "sort=alphabetical",
        "reply_needed=maybe",
        "has_pending_action=invalid",
        "extra=1",
    ],
)
def test_invalid_queries(email_client, query) -> None:
    response = email_client.get(f"/api/emails?{query}")
    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_REQUEST"


def test_overview_is_private_and_delegates_to_owned_service(email_client, monkeypatch) -> None:
    overview = Mock(return_value={"analyzed_count": 2})
    monkeypatch.setattr(service, "user_overview", overview)
    response = email_client.get("/api/emails/overview")
    assert response.status_code == 200
    assert response.json["data"] == {"analyzed_count": 2}
    assert response.headers["Cache-Control"] == "no-store"
    with email_client.session_transaction() as session:
        assert str(overview.call_args.args[1]) == session["user_id"]
        session.clear()
    assert email_client.get("/api/emails/overview").status_code == 401
    assert overview.call_count == 1


def test_list_sync_detail_and_history_contracts(email_client, monkeypatch) -> None:
    monkeypatch.setattr(service, "list_user_emails", Mock(return_value={"emails": [], "total": 0}))
    response = email_client.get("/api/emails?priority=High&category=Work&analysis_status=completed")
    assert response.status_code == 200 and response.json["success"]
    assert response.headers["Cache-Control"] == "no-store"
    assert service.list_user_emails.call_args.args[2].priority == "High"
    monkeypatch.setattr(service, "sync_emails", Mock(return_value={"imported": 1}))
    assert (
        email_client.post("/api/emails/sync", headers={"X-CSRF-Token": "csrf"}).json["data"][
            "imported"
        ]
        == 1
    )
    email_id = uuid4()
    monkeypatch.setattr(
        service,
        "email_detail",
        Mock(side_effect=IntegrationError("EMAIL_NOT_FOUND", "Email not found.", 404)),
    )
    assert email_client.get(f"/api/emails/{email_id}").status_code == 404
    monkeypatch.setattr(
        service, "analysis_history", Mock(return_value={"analyses": [], "total": 0})
    )
    assert email_client.get(f"/api/emails/{email_id}/analyses").status_code == 200


def test_analyze_validation_and_rate_limit(email_client, monkeypatch) -> None:
    process = Mock(side_effect=AnalysisError("AI_RATE_LIMITED", "Try later.", 429, "15"))
    monkeypatch.setattr(service, "process_email", process)
    path = f"/api/emails/{uuid4()}/analyze"
    headers = {"X-CSRF-Token": "csrf"}
    assert email_client.post(path, json={"force": "yes"}, headers=headers).status_code == 400
    process.assert_not_called()
    response = email_client.post(path, json={"force": True}, headers=headers)
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "15"
    assert process.call_args.kwargs["force"] is True


def test_schema_defaults_and_expired_deadline() -> None:
    assert EmailQuery().limit == 20
    assert AnalyzeRequest().force is False
    with pytest.raises(IntegrationError, match="SYNC_TIME_BUDGET"):
        remaining_time(0)

from contextlib import nullcontext
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.config import Settings
from app.schemas.action_schema import ActionQuery, CreateActionRequest, UpdateActionRequest
from app.services import action_service as service
from app.services import email_service
from app.services.integration_errors import IntegrationError


@pytest.fixture
def client(monkeypatch):
    app = create_app(Settings(_env_file=None, secret_key="test"))
    app.config["TESTING"] = True
    app.extensions["database"] = Mock()
    monkeypatch.setattr(email_service, "require_user", Mock())
    client = app.test_client()
    with client.session_transaction() as session:
        session["user_id"] = str(uuid4())
        session["csrf_token"] = "csrf"
    return client


@pytest.mark.parametrize(
    "method,path", [("post", "/api/actions"), ("patch", f"/api/actions/{uuid4()}")]
)
def test_mutations_require_csrf_and_session(client, method, path) -> None:
    assert getattr(client, method)(path, json={}).status_code == 403
    with client.session_transaction() as session:
        session.clear()
    assert (
        getattr(client, method)(path, json={}, headers={"X-CSRF-Token": "csrf"}).status_code == 401
    )
    assert client.get("/api/actions").status_code == 401


@pytest.mark.parametrize(
    "query", ["status=bad", "limit=0", "limit=101", "offset=-1", "email_id=bad", "extra=1"]
)
def test_invalid_queries(client, query) -> None:
    assert client.get(f"/api/actions?{query}").status_code == 400


@pytest.mark.parametrize(
    "changes",
    [
        {"description": "  "},
        {"description": "x" * 2001},
        {"description": 1},
        {"email_id": "bad"},
        {"due_date": "2026-02-30"},
        {"due_date": "2026-11-17T00:00:00Z"},
        {"due_date": 0},
        {"extra": True},
    ],
)
def test_invalid_creation(client, changes) -> None:
    payload = {"email_id": str(uuid4()), "description": "Review", **changes}
    response = client.post("/api/actions", json=payload, headers={"X-CSRF-Token": "csrf"})
    assert response.status_code == 400
    assert response.json["error"] == {
        "code": "INVALID_REQUEST",
        "message": "Invalid action request.",
    }


@pytest.mark.parametrize(
    "payload", [{"status": "bad"}, {}, {"status": "pending", "description": "no"}]
)
def test_invalid_updates(client, payload) -> None:
    assert (
        client.patch(
            f"/api/actions/{uuid4()}", json=payload, headers={"X-CSRF-Token": "csrf"}
        ).status_code
        == 400
    )


@pytest.mark.parametrize("reused,code", [(False, 201), (True, 200)])
def test_creation_contract(client, monkeypatch, reused, code) -> None:
    create = Mock(
        return_value={"action": {"status": "completed" if reused else "pending"}, "reused": reused}
    )
    monkeypatch.setattr(service, "create_action", create)
    email_id = str(uuid4())
    response = client.post(
        "/api/actions",
        json={"email_id": email_id, "description": "  Review  ", "due_date": "2026-11-17"},
        headers={"X-CSRF-Token": "csrf"},
    )
    assert response.status_code == code
    assert response.json["data"]["reused"] is reused
    assert response.headers["Cache-Control"] == "no-store"
    assert create.call_args.args[2].description == "Review"
    assert str(create.call_args.args[2].email_id) == email_id
    with client.session_transaction() as session:
        assert str(create.call_args.args[1]) == session["user_id"]


def test_list_and_update_contract(client, monkeypatch) -> None:
    listing = Mock(return_value={"actions": [], "total": 0, "limit": 20, "offset": 20})
    monkeypatch.setattr(service, "list_actions", listing)
    response = client.get("/api/actions?status=pending&offset=20")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert listing.call_args.args[2] == ActionQuery(status="pending", offset=20)
    update = Mock(return_value={"status": "dismissed"})
    monkeypatch.setattr(service, "update_action", update)
    action_id = uuid4()
    response = client.patch(
        f"/api/actions/{action_id}", json={"status": "dismissed"}, headers={"X-CSRF-Token": "csrf"}
    )
    assert response.json["data"]["status"] == "dismissed"
    assert update.call_args.args[2] == action_id


def test_safe_errors(client, monkeypatch, caplog) -> None:
    monkeypatch.setattr(
        service, "list_actions", Mock(side_effect=SQLAlchemyError("private email data"))
    )
    response = client.get("/api/actions")
    assert response.status_code == 503
    assert "private" not in response.get_data(as_text=True)
    assert "private email data" not in caplog.text
    monkeypatch.setattr(
        service,
        "update_action",
        Mock(side_effect=IntegrationError("ACTION_NOT_FOUND", "Action not found.", 404)),
    )
    assert (
        client.patch(
            f"/api/actions/{uuid4()}", json={"status": "pending"}, headers={"X-CSRF-Token": "csrf"}
        ).status_code
        == 404
    )
    response = client.post(
        "/api/actions",
        data="x" * 17000,
        content_type="application/json",
        headers={"X-CSRF-Token": "csrf"},
    )
    assert response.status_code == 413


def test_service_missing_owned_records(monkeypatch) -> None:
    database = Mock()
    database.session_factory.begin.side_effect = lambda: nullcontext(Mock())
    monkeypatch.setattr(service.actions, "create_or_reuse_action", Mock(side_effect=LookupError()))
    with pytest.raises(IntegrationError, match="EMAIL_NOT_FOUND"):
        service.create_action(
            database, uuid4(), CreateActionRequest(email_id=uuid4(), description="Review")
        )
    monkeypatch.setattr(service.actions, "update_action_status", Mock(return_value=None))
    with pytest.raises(IntegrationError, match="ACTION_NOT_FOUND"):
        service.update_action(database, uuid4(), uuid4(), UpdateActionRequest(status="pending"))


def test_service_serializes_inside_transaction(monkeypatch) -> None:
    database = Mock()
    session = Mock()
    database.session_factory.begin.side_effect = lambda: nullcontext(session)
    now = datetime.now(UTC)
    action = SimpleNamespace(
        id=uuid4(),
        email_id=uuid4(),
        description="Review",
        due_date=None,
        status="completed",
        created_at=now,
        updated_at=now,
        email=SimpleNamespace(subject="Synthetic", sender=None),
    )
    create = Mock(return_value=(action, True))
    monkeypatch.setattr(service.actions, "create_or_reuse_action", create)
    user_id = uuid4()
    result = service.create_action(
        database, user_id, CreateActionRequest(email_id=action.email_id, description="Review")
    )
    assert result["reused"] is True
    assert result["action"]["status"] == "completed"
    assert result["action"]["email_subject"] == "Synthetic"
    assert result["action"]["due_date"] is None
    assert create.call_args.args == (session, user_id)

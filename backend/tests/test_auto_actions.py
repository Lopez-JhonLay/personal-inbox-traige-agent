"""Offline orchestration checks; provider and database boundaries are mocked."""

from contextlib import nullcontext
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.config import Settings
from app.services import email_service as service
from app.services.ai_service import AnalysisError


@pytest.fixture
def processing(monkeypatch):
    session = Mock()
    session.begin_nested.side_effect = lambda: nullcontext()
    database = Mock()
    database.session_factory.begin.side_effect = lambda: nullcontext(session)
    user_id, email_id, record_id = uuid4(), uuid4(), uuid4()
    monkeypatch.setattr(service.operations, "acquire_operation", Mock(return_value=uuid4()))
    monkeypatch.setattr(service.operations, "require_operation", Mock())
    monkeypatch.setattr(service.operations, "release_operation", Mock())
    email = SimpleNamespace(
        subject="Review",
        sender="sender@example.invalid",
        body="Please review the report.",
        received_at=datetime.now(UTC),
    )
    monkeypatch.setattr(service.emails, "get_email", Mock(return_value=email))
    monkeypatch.setattr(
        service.users, "get_user", Mock(return_value=SimpleNamespace(timezone="UTC"))
    )
    monkeypatch.setattr(service.queries, "latest_attempt", Mock(return_value=None))
    record = SimpleNamespace(id=record_id, status="processing", model_identifier="test")
    monkeypatch.setattr(service.analyses, "create_analysis", Mock(return_value=record))
    monkeypatch.setattr(service.analyses, "get_analysis", Mock(return_value=record))
    monkeypatch.setattr(service.analyses, "update_analysis", Mock())
    monkeypatch.setattr(
        service, "analysis_data", lambda record: {"id": str(record.id), "status": "completed"}
    )
    analysis = dict(
        summary="Review the report.",
        category="Work",
        priority="Medium",
        deadline=None,
        deadline_text=None,
        requested_action="Review the report.",
        suggested_action=None,
        reply_needed=False,
        draft_reply=None,
    )
    monkeypatch.setattr(
        service, "analyze_email", Mock(return_value={"analysis": analysis, "model": "test"})
    )
    monkeypatch.setattr(service, "should_add_action", Mock(return_value=True))
    monkeypatch.setattr(service.actions, "first_email_action", Mock(return_value=None))
    task = SimpleNamespace(id=uuid4())
    monkeypatch.setattr(
        service.actions, "create_automatic_action", Mock(return_value=(task, False))
    )
    return SimpleNamespace(
        session=session,
        database=database,
        user_id=user_id,
        email_id=email_id,
        analysis=analysis,
        task=task,
        record=record,
    )


def run(p: SimpleNamespace, force: bool = False) -> dict:
    return service.process_email(
        Settings(_env_file=None), p.database, p.user_id, p.email_id, force=force
    )


def test_automatic_task_uses_server_owned_context(processing) -> None:
    p = processing
    result = run(p)
    assert result["auto_action"] == {"status": "created", "action_id": str(p.task.id)}
    service.actions.create_automatic_action.assert_called_once_with(
        p.session, p.user_id, p.email_id, description="Review the report.", due_date=None
    )
    service.analyses.update_analysis.assert_called_once()
    assert service.analyses.update_analysis.call_args.kwargs["status"] == "completed"


@pytest.mark.parametrize("reason", ["no_request", "existing", "reused", "no_call"])
def test_skips_unneeded_automation(processing, reason) -> None:
    p = processing
    if reason == "no_request":
        p.analysis["requested_action"] = None
    elif reason == "existing":
        service.actions.first_email_action.return_value = p.task
    elif reason == "reused":
        p.record.status = "completed"
        service.queries.latest_attempt.return_value = p.record
    else:
        service.should_add_action.return_value = False
    result = run(p)
    expected = {
        "no_request": "not_needed",
        "existing": "existing",
        "reused": "skipped",
        "no_call": "not_needed",
    }
    assert result["auto_action"]["status"] == expected[reason]
    service.actions.create_automatic_action.assert_not_called()
    if reason != "no_call":
        service.should_add_action.assert_not_called()


@pytest.mark.parametrize("code", ["AI_TIMEOUT", "AI_INVALID_OUTPUT", "AI_RATE_LIMITED"])
def test_task_failure_preserves_analysis(processing, code) -> None:
    service.should_add_action.side_effect = AnalysisError(code, "Unavailable.", 503, "30")
    result = run(processing)
    assert result["auto_action"] == {
        "status": "unavailable",
        "error_code": code,
        "retry_after": "30",
    }
    assert service.analyses.update_analysis.call_args.kwargs["status"] == "completed"
    service.actions.create_automatic_action.assert_not_called()


def test_task_write_is_isolated_by_savepoint(processing) -> None:
    service.actions.create_automatic_action.side_effect = SQLAlchemyError("private")
    result = run(processing)
    assert result["auto_action"] == {"status": "unavailable", "error_code": "DATABASE_UNAVAILABLE"}
    processing.session.begin_nested.assert_called_once()
    assert service.analyses.update_analysis.call_args.kwargs["status"] == "completed"


def test_manual_task_wins_race_without_being_changed(processing) -> None:
    service.actions.create_automatic_action.return_value = (processing.task, True)
    assert run(processing)["auto_action"] == {
        "status": "existing",
        "action_id": str(processing.task.id),
    }


def test_expired_operation_prevents_task_insertion(processing) -> None:
    from app.services.integration_errors import IntegrationError

    def decide(*args):
        service.operations.require_operation.side_effect = IntegrationError(
            "OPERATION_EXPIRED", "Stopped.", 409
        )
        return True

    service.should_add_action.side_effect = decide
    with pytest.raises(IntegrationError, match="OPERATION_EXPIRED"):
        run(processing)
    service.actions.create_automatic_action.assert_not_called()

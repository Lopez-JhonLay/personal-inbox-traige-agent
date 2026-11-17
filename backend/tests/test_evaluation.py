"""Offline regression tests for evaluation scoring and explicit network opt-in."""

import json
from unittest.mock import Mock

import pytest

from app.config import Settings
from app.services.ai_service import AnalysisError
from scripts import evaluate_analysis, evaluate_task_decisions


@pytest.mark.parametrize("module", [evaluate_analysis, evaluate_task_decisions])
def test_cli_requires_live_before_loading_configuration(module, monkeypatch) -> None:
    settings = Mock()
    monkeypatch.setattr(module, "Settings", settings)
    monkeypatch.setattr("sys.argv", ["evaluate"])
    with pytest.raises(SystemExit) as error:
        module.main()
    assert error.value.code == 2
    settings.assert_not_called()


@pytest.mark.parametrize("module", [evaluate_analysis, evaluate_task_decisions])
@pytest.mark.parametrize("passed,exit_code", [(1, 1), (8, 0)])
def test_cli_does_not_pass_an_incomplete_run(module, monkeypatch, passed, exit_code) -> None:
    monkeypatch.setattr(module, "Settings", Mock())
    monkeypatch.setattr(
        module, "evaluate", Mock(return_value={"cases_passed": passed, "cases_total": 8})
    )
    monkeypatch.setattr("sys.argv", ["evaluate", "--live"])
    assert module.main() == exit_code


def test_analysis_scores_first_pass_and_reports_unattempted_cases(monkeypatch) -> None:
    cases = json.loads(evaluate_analysis.CASES_PATH.read_text(encoding="utf-8"))
    responses = []
    for case in cases[:2]:
        analysis = {**case["expected"]}
        for field in case.get("required_non_null", []):
            analysis[field] = "Synthetic value"
        responses.append({"analysis": analysis})
    responses[0]["analysis"]["priority"] = "Low"
    analyze = Mock(side_effect=responses)
    monkeypatch.setattr(evaluate_analysis, "analyze_email", analyze)
    monkeypatch.setattr(evaluate_analysis.time, "sleep", lambda _: None)
    report = evaluate_analysis.evaluate(Settings(_env_file=None, openrouter_api_key="synthetic"), 2)
    assert analyze.call_count == 2
    assert report["cases_passed"] == 1
    assert report["metrics"]["priority"] == {"passed": 1, "attempted": 2}
    assert report["metrics"]["category"] == {"passed": 2, "attempted": 2}
    assert report["metrics"]["valid_output"] == {"passed": 2, "attempted": 2}
    assert report["unattempted_cases"] == [case["id"] for case in cases[2:]]
    assert not report["complete"]
    assert report["prompt_version"]
    assert report["run_at"]


def test_task_mismatch_is_not_retried_and_metadata_is_reported(monkeypatch) -> None:
    decide = Mock(return_value=False)
    monkeypatch.setattr(evaluate_task_decisions, "should_add_action", decide)
    report = evaluate_task_decisions.evaluate(
        Settings(_env_file=None, openrouter_api_key="synthetic"), 1
    )
    assert decide.call_count == 1
    assert report["metrics"]["task_decision"] == {"passed": 0, "attempted": 1}
    assert report["provider_errors"] == {}
    assert report["prompt_version"]
    assert report["run_at"]


@pytest.mark.parametrize("code", ["AI_TIMEOUT", "AI_UNAVAILABLE", "AI_RATE_LIMITED"])
def test_analysis_stops_on_provider_availability_failure(monkeypatch, code) -> None:
    analyze = Mock(side_effect=AnalysisError(code, "Synthetic failure", 503))
    monkeypatch.setattr(evaluate_analysis, "analyze_email", analyze)
    report = evaluate_analysis.evaluate(Settings(_env_file=None, openrouter_api_key="synthetic"), 8)
    assert analyze.call_count == 1
    assert len(report["unattempted_cases"]) == 7
    assert report["metrics"]["category"] == {"passed": 0, "attempted": 0}

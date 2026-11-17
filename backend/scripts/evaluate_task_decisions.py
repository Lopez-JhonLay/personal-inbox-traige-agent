"""Explicitly opt-in synthetic tool evaluation; never connects to Gmail or the database."""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings  # noqa: E402
from app.schemas.analysis_schema import EmailAnalysis, EmailInput  # noqa: E402
from app.services.ai_service import AnalysisError, should_add_action  # noqa: E402

CASES_PATH = Path(__file__).resolve().parents[1] / "tests/fixtures/task_decisions.json"


def evaluate(settings: Settings, max_requests: int) -> dict:
    if not 1 <= max_requests <= 8:
        raise ValueError("Use a budget from one to eight requests.")
    if settings.openrouter_model != "baidu/ernie-5.5-flash-preview:free":
        raise ValueError("This evaluation is restricted to the configured free ERNIE model.")
    results = []
    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    for case in cases[:max_requests]:
        if results:
            time.sleep(4)
        email = EmailInput.model_validate_json(
            json.dumps(
                {
                    "subject": "Fictional task evaluation",
                    "sender": "test@example.invalid",
                    "body": case["body"],
                    "received_at": "2026-11-17T09:00:00+08:00",
                    "timezone": "Asia/Manila",
                }
            )
        )
        analysis = EmailAnalysis.model_validate_json(
            json.dumps(
                {
                    "summary": case["body"],
                    "category": "Work",
                    "priority": "Medium",
                    "deadline": None,
                    "deadline_text": None,
                    "requested_action": case["requested_action"],
                    "suggested_action": None,
                    "reply_needed": False,
                    "draft_reply": None,
                }
            )
        )
        print(f"Evaluating task decision: {case['id']}", file=sys.stderr, flush=True)
        try:
            actual = should_add_action(email, analysis, settings)
            results.append(
                {
                    "case": case["id"],
                    "expected": case["expected"],
                    "actual": actual,
                    "passed": actual == case["expected"],
                }
            )
        except AnalysisError as error:
            results.append({"case": case["id"], "error_code": error.code, "passed": False})
            break
    return {
        "requests_attempted": len(results),
        "cases_passed": sum(r["passed"] for r in results),
        "cases_total": len(cases),
        "results": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="Allow synthetic OpenRouter requests")
    parser.add_argument("--max-requests", type=int, default=8)
    args = parser.parse_args()
    if not args.live:
        parser.error("Pass --live to explicitly enable synthetic network requests.")
    report = evaluate(Settings(), args.max_requests)
    print(json.dumps(report, indent=2))
    return 0 if report["cases_passed"] == report["cases_total"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

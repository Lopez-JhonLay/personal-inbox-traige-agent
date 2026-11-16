"""Opt-in synthetic evaluation. Each run makes at most ten inference requests."""

import argparse
import json
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings  # noqa: E402
from app.schemas.analysis_schema import EmailInput  # noqa: E402
from app.services.ai_service import AnalysisError, analyze_email  # noqa: E402

CASES_PATH = Path(__file__).resolve().parents[1] / "tests/fixtures/analysis_emails.json"
EVALUATION_TIME = datetime(2026, 11, 16, 4, 0, tzinfo=UTC)
EVALUATION_MODELS = ("openrouter/free", "baidu/ernie-5.5-flash-preview:free")


def evaluate(settings: Settings, max_requests: int, case_ids: list[str] | None = None) -> dict:
    if not 1 <= max_requests <= 10:
        raise ValueError("Evaluation budget must be between one and ten requests.")
    if settings.openrouter_model not in EVALUATION_MODELS:
        raise ValueError("This evaluation is restricted to the explicitly allowed free models.")
    if not settings.openrouter_api_key:
        raise ValueError("Configure OPENROUTER_API_KEY locally before evaluation.")
    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    if case_ids:
        unknown = set(case_ids) - {case["id"] for case in cases}
        if unknown:
            raise ValueError("Unknown evaluation case IDs.")
        cases = [case for case in cases if case["id"] in case_ids]
    pending = list(cases)
    results = {}
    history = []
    attempts = 0
    while pending and attempts < max_requests:
        case = pending.pop(0)
        if attempts:
            time.sleep(4)  # Below the documented 20 requests/minute free-model ceiling.
        attempts += 1
        print(f"Evaluating {case['id']} (request {attempts}/{max_requests})", file=sys.stderr)
        try:
            result = analyze_email(
                EmailInput.model_validate_json(json.dumps(case["email"])),
                settings,
                max_attempts=1,
                now=EVALUATION_TIME,
            )
            mismatches = {
                key: {"expected": value, "actual": result["analysis"][key]}
                for key, value in case["expected"].items()
                if (
                    result["analysis"][key] not in value
                    if isinstance(value, list)
                    else result["analysis"][key] != value
                )
            }
            for key in case.get("required_non_null", []):
                if result["analysis"][key] is None:
                    mismatches[key] = {"expected": "non-null", "actual": None}
            results[case["id"]] = {
                "result": result,
                "mismatches": mismatches,
                "manual_review": case["review"],
            }
            history.append({"case": case["id"], **results[case["id"]]})
            if mismatches:
                pending.append(case)
        except AnalysisError as error:
            results[case["id"]] = {
                "error": error.code,
                "reason": error.reason,
                "retry_after": error.retry_after,
            }
            history.append({"case": case["id"], **results[case["id"]]})
            if error.code in {"AI_RATE_LIMITED", "AI_NOT_CONFIGURED", "AI_UNAVAILABLE"}:
                break  # Do not spend the evaluation budget probing capacity/auth problems.
            pending.append(case)
    passed = sum("result" in result and not result["mismatches"] for result in results.values())
    return {
        "requested_model": settings.openrouter_model,
        "requests_attempted": attempts,
        "cases_passed": passed,
        "cases_total": len(cases),
        "evaluation_time": EVALUATION_TIME.isoformat(),
        "manual_review_required": True,
        "results": results,
        "attempt_history": history,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-requests", type=int, choices=range(1, 11), default=10)
    parser.add_argument("--model", choices=EVALUATION_MODELS)
    parser.add_argument("--case", action="append", dest="case_ids", help="Run only named case(s).")
    args = parser.parse_args()
    try:
        settings = Settings()
        if args.model:
            settings = settings.model_copy(update={"openrouter_model": args.model})
        report = evaluate(settings, args.max_requests, args.case_ids)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1
    print(json.dumps(report, indent=2, ensure_ascii=True))
    return 0 if report["cases_passed"] == report["cases_total"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

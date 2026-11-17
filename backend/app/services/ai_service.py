import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from email.utils import parsedate_to_datetime

from openai import (
    APIConnectionError,
    APIResponseValidationError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
)
from pydantic import ValidationError

from app.config import Settings
from app.schemas.analysis_schema import EmailAnalysis, EmailInput, ProviderEmailAnalysis
from app.services.analysis_prompt import PROMPT_VERSION, build_messages

logger = logging.getLogger(__name__)


@dataclass
class AnalysisError(Exception):
    code: str
    message: str
    status: int
    retry_after: str | None = None
    reason: str | None = None


def safe_retry_after(value: str | None) -> str | None:
    if not value or len(value) > 100 or "\r" in value or "\n" in value:
        return None
    if value.isascii() and value.isdigit():
        return value
    try:
        if parsedate_to_datetime(value).tzinfo is not None:
            return value
    except ValueError, TypeError, OverflowError:
        pass
    return None


def create_openrouter_client(settings: Settings) -> OpenAI:
    if not settings.openrouter_api_key:
        raise ValueError("Set OPENROUTER_API_KEY before creating the OpenRouter client.")
    return OpenAI(
        api_key=settings.openrouter_api_key.get_secret_value(),
        base_url=settings.openrouter_base_url,
        timeout=30.0,
        max_retries=0,
        _strict_response_validation=True,
    )


def analyze_email(
    email: EmailInput,
    settings: Settings,
    *,
    max_attempts: int = 2,
    now: datetime | None = None,
) -> dict:
    if max_attempts not in (1, 2):
        raise ValueError("Use one or two attempts.")
    if not settings.openrouter_api_key or not settings.openrouter_model.strip():
        raise AnalysisError("AI_NOT_CONFIGURED", "The AI service is not configured.", 503)

    messages = build_messages(email, now)
    with create_openrouter_client(settings) as client:
        for attempt in range(max_attempts):
            retryable = False
            output_issue = "schema_or_json"
            try:
                response = client.chat.completions.create(
                    model=settings.openrouter_model,
                    messages=messages,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": "email_analysis",
                            "strict": True,
                            "schema": ProviderEmailAnalysis.model_json_schema(),
                        },
                    },
                    max_tokens=4096,
                    extra_body={"provider": {"require_parameters": True}},
                )
                if not response.choices:
                    output_issue = "missing_choice"
                    raise ValueError("Missing completion.")
                choice = response.choices[0]
                if choice.message.refusal or choice.finish_reason == "content_filter":
                    raise AnalysisError("AI_REFUSED", "The AI service declined the analysis.", 502)
                if choice.finish_reason != "stop" or not choice.message.content:
                    output_issue = "truncated_or_empty"
                    raise ValueError("Incomplete completion.")
                try:
                    provider_result = ProviderEmailAnalysis.model_validate_json(
                        choice.message.content
                    )
                except ValidationError as exc:
                    issues = exc.errors(include_input=False, include_context=False)
                    if not all(issue["loc"][:1] == ("draft_reply",) for issue in issues):
                        raise
                    # A bad optional reply must not discard otherwise valid analysis.
                    payload = json.loads(choice.message.content)
                    payload["draft_reply"] = None
                    provider_result = ProviderEmailAnalysis.model_validate_json(json.dumps(payload))
                    logger.warning("AI reply omitted reason=invalid_reply_sections")
                payload = provider_result.model_dump(mode="json", exclude={"draft_reply"})
                payload["draft_reply"] = (
                    provider_result.draft_reply.as_text()
                    if provider_result.reply_needed and provider_result.draft_reply is not None
                    else None
                )
                result = EmailAnalysis.model_validate_json(json.dumps(payload))
                if result.deadline_text is not None:
                    source = " ".join(f"{email.subject}\n{email.body}".split()).casefold()
                    phrase = " ".join(result.deadline_text.split()).casefold()
                    if phrase not in source:
                        output_issue = "deadline_not_in_source"
                        raise ValueError("Deadline wording is not in the source email.")
                usage = None
                if response.usage:
                    usage = {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens,
                    }
                logger.info(
                    "AI analysis completed model=%s prompt_version=%s usage=%s",
                    response.model,
                    PROMPT_VERSION,
                    usage,
                )
                return {
                    "analysis": result.model_dump(mode="json"),
                    "model": response.model,
                    "prompt_version": PROMPT_VERSION,
                    "usage": usage,
                }
            except APITimeoutError:
                error = AnalysisError("AI_TIMEOUT", "The AI service timed out.", 504)
                retryable = True
            except APIConnectionError:
                error = AnalysisError("AI_UNAVAILABLE", "The AI service is unavailable.", 503)
                retryable = True
            except APIStatusError as exc:
                if exc.status_code == 429:
                    raise AnalysisError(
                        "AI_RATE_LIMITED",
                        "The AI service is temporarily rate limited.",
                        429,
                        safe_retry_after(exc.response.headers.get("Retry-After")),
                    ) from None
                error = AnalysisError("AI_UNAVAILABLE", "The AI service is unavailable.", 503)
                retryable = exc.status_code >= 500
            except ValidationError, ValueError, APIResponseValidationError:
                error = AnalysisError(
                    "AI_INVALID_OUTPUT",
                    "We couldn\u2019t finish analyzing this email. Please try again.",
                    502,
                    reason=output_issue,
                )
                retryable = True
            logger.warning(
                "AI analysis failed code=%s reason=%s attempt=%s",
                error.code,
                error.reason,
                attempt + 1,
            )
            if not retryable or attempt + 1 == max_attempts:
                raise error from None
            time.sleep(1)
    raise RuntimeError("Analysis attempts exhausted.")

import base64
import json
from unittest.mock import Mock

import httplib2
import pytest
from googleapiclient.errors import HttpError

from app.services.gmail_normalization import normalize_message
from app.services.gmail_service import (
    get_gmail_profile,
    get_message,
    gmail_request,
    list_message_ids,
)
from app.services.integration_errors import IntegrationError


def part(mime: str, text: str, **kwargs) -> dict:
    return {
        "mimeType": mime,
        "body": {"data": base64.urlsafe_b64encode(text.encode()).decode().rstrip("=")},
        **kwargs,
    }


def message(payload: dict) -> dict:
    return {
        "id": "message",
        "threadId": "thread",
        "internalDate": "1794787200000",
        "payload": payload,
    }


def test_plaintext_headers_timestamp_and_bounds() -> None:
    result = normalize_message(
        message(
            part(
                "text/plain",
                "a" * 30_000,
                headers=[
                    {"name": "From", "value": "sender@example.invalid"},
                    {"name": "Subject", "value": "s" * 600},
                ],
            )
        )
    )
    assert len(result.body) == 20_000
    assert len(result.subject) == 500
    assert result.sender == "sender@example.invalid"
    assert result.received_at.utcoffset().total_seconds() == 0
    assert result.gmail_message_id != result.gmail_thread_id


def test_nested_mime_prefers_plain_and_ignores_attachment() -> None:
    payload = {
        "mimeType": "multipart/mixed",
        "parts": [
            {
                "mimeType": "multipart/alternative",
                "parts": [part("text/html", "<p>HTML</p>"), part("text/plain", "Readable text")],
            },
            part("text/plain", "private attachment", filename="secret.txt"),
            {"mimeType": "text/plain", "body": {"attachmentId": "do-not-fetch"}},
        ],
    }
    assert normalize_message(message(payload)).body == "Readable text"


def test_html_removes_scripts_styles_and_does_not_load_remote_resources() -> None:
    payload = part(
        "text/html",
        "<head><style>secret</style></head><p>Hello &amp; welcome</p>"
        '<script>bad()</script><p>Next<img src="https://example.invalid/image"></p>',
    )
    result = normalize_message(message(payload))
    assert "Hello & welcome" in result.body and "Next" in result.body
    assert "secret" not in result.body and "bad" not in result.body and "https" not in result.body


def test_missing_headers_empty_body_and_charset() -> None:
    result = normalize_message(message(part("text/plain", "")))
    assert result.body == "" and result.subject == "" and result.sender is None
    payload = {
        "mimeType": "text/plain",
        "headers": [{"name": "Content-Type", "value": "text/plain; charset=iso-8859-1"}],
        "body": {"data": base64.urlsafe_b64encode(b"caf\xe9").decode()},
    }
    assert normalize_message(message(payload)).body == "caf\u00e9"


@pytest.mark.parametrize(
    "payload",
    [
        {"mimeType": "text/plain", "body": {"data": "!invalid!"}},
        part("text/plain", "x" * 256_001),
        {"mimeType": "multipart/mixed", "parts": [{}] * 201},
    ],
)
def test_malformed_or_oversized_messages(payload) -> None:
    with pytest.raises(IntegrationError, match="GMAIL_MESSAGE_INVALID"):
        normalize_message(message(payload))


@pytest.mark.parametrize(
    "status,reason,code",
    [
        (401, "authError", "GMAIL_REAUTH_REQUIRED"),
        (403, "insufficientPermissions", "GMAIL_PERMISSION_DENIED"),
        (403, "rateLimitExceeded", "GMAIL_RATE_LIMITED"),
        (429, "rateLimitExceeded", "GMAIL_RATE_LIMITED"),
        (503, "backendError", "GMAIL_UNAVAILABLE"),
    ],
)
def test_provider_errors_are_safe(status, reason, code) -> None:
    request = Mock()
    request.execute.side_effect = HttpError(
        httplib2.Response({"status": status}),
        json.dumps(
            {"error": {"message": "private email data", "errors": [{"reason": reason}]}}
        ).encode(),
    )
    with pytest.raises(IntegrationError, match=code) as error:
        gmail_request(request)
    assert "private" not in str(error.value)


def test_gmail_operations_are_readonly() -> None:
    client = Mock()
    client.users().getProfile().execute.return_value = {"emailAddress": "SAMPLE@example.invalid"}
    assert get_gmail_profile(client) == "sample@example.invalid"
    client.users().messages().list().execute.return_value = {"messages": [{"id": "one"}]}
    assert list_message_ids(client, limit=1) == ["one"]
    client.users().messages().list.assert_called_with(userId="me", labelIds=["INBOX"], maxResults=1)
    client.users().messages().get().execute.return_value = message(part("text/plain", "hello"))
    assert get_message(client, "one").body == "hello"
    client.users().messages().get.assert_called_with(userId="me", id="one", format="full")

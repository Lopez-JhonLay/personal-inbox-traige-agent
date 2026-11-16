import base64
import binascii
from datetime import UTC, datetime
from email.message import Message
from html.parser import HTMLParser

from app.schemas.gmail_schema import NormalizedEmail
from app.services.integration_errors import IntegrationError

MAX_DECODED_BYTES = 256_000
MAX_PARTS = 200


class ReadableHTML(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "head"}:
            self.hidden += 1
        if not self.hidden and tag in {"p", "br", "div", "li", "tr", "h1", "h2", "h3"}:
            self.text.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "head"}:
            self.hidden = max(0, self.hidden - 1)
        if not self.hidden and tag in {"p", "div", "li", "tr"}:
            self.text.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.text.append(data)


def normalize_message(message: dict) -> NormalizedEmail:
    """Normalize bounded inline MIME text; attachment data is never fetched."""
    try:
        payload = message.get("payload", {})
        headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
        plain: list[str] = []
        html: list[str] = []
        stack = [(payload, 0)]
        remaining = MAX_DECODED_BYTES
        visited = 0
        while stack:
            part, depth = stack.pop()
            visited += 1
            if visited > MAX_PARTS or depth > 20:
                raise ValueError("MIME structure too large")
            part_headers = {h["name"].lower(): h["value"] for h in part.get("headers", [])}
            if part.get("filename") or part_headers.get(
                "content-disposition", ""
            ).lower().startswith("attachment"):
                continue
            mime = part.get("mimeType", "").lower()
            if mime.startswith("multipart/"):
                children = part.get("parts", [])
                if len(children) > MAX_PARTS:
                    raise ValueError("Too many MIME parts")
                stack.extend((child, depth + 1) for child in reversed(children))
                continue
            if mime not in {"text/plain", "text/html"}:
                continue
            body = part.get("body", {})
            if body.get("attachmentId") or not body.get("data"):
                continue
            data = body["data"]
            if len(data) > ((remaining + 2) // 3) * 4:
                raise ValueError("Body too large")
            decoded = base64.b64decode(data + "=" * (-len(data) % 4), altchars=b"-_", validate=True)
            remaining -= len(decoded)
            if remaining < 0:
                raise ValueError("Body too large")
            content_type = Message()
            content_type["content-type"] = part_headers.get("content-type", mime)
            charset = content_type.get_content_charset() or "utf-8"
            try:
                text = decoded.decode(charset, errors="replace")
            except LookupError:
                text = decoded.decode("utf-8", errors="replace")
            if text.strip():
                (plain if mime == "text/plain" else html).append(text)
        text = "\n".join(plain)
        if not text.strip() and html:
            parser = ReadableHTML()
            parser.feed("\n".join(html))
            text = "".join(parser.text)
        text = "\n".join(" ".join(line.split()) for line in text.splitlines()).strip()
        message_id, thread_id = message["id"], message["threadId"]
        if not message_id or not thread_id:
            raise ValueError("Missing identifiers")
        received_at = datetime.fromtimestamp(int(message["internalDate"]) / 1000, UTC)
        return NormalizedEmail(
            gmail_message_id=message_id,
            gmail_thread_id=thread_id,
            sender=headers.get("from", "")[:320] or None,
            subject=headers.get("subject", "")[:500],
            received_at=received_at,
            body=text[:20_000],
        )
    except KeyError, TypeError, ValueError, AttributeError, OverflowError, OSError, binascii.Error:
        raise IntegrationError(
            "GMAIL_MESSAGE_INVALID", "This message could not be read.", 422
        ) from None

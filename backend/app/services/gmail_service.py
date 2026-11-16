import json

import httplib2
from google.auth.exceptions import RefreshError, TransportError
from google.oauth2.credentials import Credentials
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.discovery import Resource, build
from googleapiclient.errors import HttpError
from googleapiclient.http import HttpRequest

from app.schemas.gmail_schema import NormalizedEmail
from app.services.gmail_normalization import normalize_message
from app.services.integration_errors import IntegrationError
from app.utils.deadline import remaining_time


def create_gmail_client(credentials: Credentials) -> Resource:
    # Bundled discovery avoids a network call while constructing the client.
    return build(
        "gmail",
        "v1",
        http=AuthorizedHttp(credentials, http=httplib2.Http(timeout=15)),
        cache_discovery=False,
        static_discovery=True,
    )


def gmail_request(request: HttpRequest, *, deadline: float | None = None) -> dict:
    if deadline is not None:
        request.http.http.timeout = remaining_time(deadline)
    try:
        return request.execute(num_retries=0)
    except HttpError as error:
        status = error.resp.status
        if status == 401:
            raise IntegrationError(
                "GMAIL_REAUTH_REQUIRED", "Reconnect Gmail to continue.", 401
            ) from None
        if status == 403:
            # Google also reports quota failures with HTTP 403.
            try:
                reasons = {
                    item.get("reason")
                    for item in json.loads(error.content).get("error", {}).get("errors", [])
                }
            except ValueError, AttributeError, TypeError:
                reasons = set()
            if reasons & {"rateLimitExceeded", "userRateLimitExceeded", "dailyLimitExceeded"}:
                raise IntegrationError(
                    "GMAIL_RATE_LIMITED", "Gmail is busy. Try again later.", 429
                ) from None
            raise IntegrationError(
                "GMAIL_PERMISSION_DENIED", "Gmail access was not granted.", 403
            ) from None
        if status == 429:
            raise IntegrationError(
                "GMAIL_RATE_LIMITED", "Gmail is busy. Try again later.", 429
            ) from None
        raise IntegrationError("GMAIL_UNAVAILABLE", "Gmail is temporarily unavailable.") from None
    except OSError, TimeoutError:
        raise IntegrationError("GMAIL_UNAVAILABLE", "Gmail is temporarily unavailable.") from None
    except RefreshError:
        raise IntegrationError(
            "GMAIL_REAUTH_REQUIRED", "Reconnect Gmail to continue.", 401
        ) from None
    except TransportError, httplib2.HttpLib2Error:
        raise IntegrationError("GMAIL_UNAVAILABLE", "Gmail is temporarily unavailable.") from None


def get_gmail_profile(client: Resource) -> str:
    profile = gmail_request(client.users().getProfile(userId="me"))
    address = profile.get("emailAddress")
    if not isinstance(address, str) or "@" not in address or len(address) > 255:
        raise IntegrationError(
            "GMAIL_PROFILE_INVALID", "Gmail account could not be identified.", 502
        )
    return address.strip().lower()


def list_message_ids(
    client: Resource, *, limit: int = 20, query: str = "", deadline: float | None = None
) -> list[str]:
    if not 1 <= limit <= 20:
        raise ValueError("Request between 1 and 20 messages.")
    arguments = {"userId": "me", "labelIds": ["INBOX"], "maxResults": limit}
    if query:
        arguments["q"] = query
    result = gmail_request(client.users().messages().list(**arguments), deadline=deadline)
    try:
        return [item["id"] for item in result.get("messages", [])][:limit]
    except KeyError, TypeError:
        raise IntegrationError(
            "GMAIL_MESSAGE_INVALID", "Gmail returned invalid message data.", 502
        ) from None


def get_message(
    client: Resource, message_id: str, *, deadline: float | None = None
) -> NormalizedEmail:
    return normalize_message(
        gmail_request(
            client.users().messages().get(userId="me", id=message_id, format="full"),
            deadline=deadline,
        )
    )

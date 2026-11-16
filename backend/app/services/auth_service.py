from uuid import UUID

import requests
from google.auth.exceptions import RefreshError, TransportError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from oauthlib.oauth2 import OAuth2Error

from app.config import Settings
from app.database import Database
from app.repositories import gmail_connection_repository as connections
from app.repositories import user_repository as users
from app.schemas.gmail_schema import ConnectionStatus
from app.services.gmail_service import create_gmail_client, get_gmail_profile
from app.services.integration_errors import IntegrationError
from app.utils.token_encryption import decrypt_token, encrypt_token, token_cipher

GMAIL_SCOPES = ("https://www.googleapis.com/auth/gmail.readonly",)


class TokenRequest(Request):
    def __call__(self, *args, **kwargs):
        kwargs["timeout"] = 15
        return super().__call__(*args, **kwargs)


def create_google_oauth_flow(
    settings: Settings, *, state: str | None = None, code_verifier: str | None = None
) -> Flow:
    if not settings.google_client_id or not settings.google_client_secret:
        raise ValueError(
            "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before creating OAuth flow."
        )
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret.get_secret_value(),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        },
        scopes=GMAIL_SCOPES,
        redirect_uri=settings.google_redirect_uri,
        state=state,
        code_verifier=code_verifier,
        autogenerate_code_verifier=code_verifier is None,
    )


def auth_configured(settings: Settings) -> bool:
    if not all(
        (
            settings.secret_key,
            settings.database_url,
            settings.google_client_id,
            settings.google_client_secret,
            settings.token_encryption_key,
        )
    ):
        return False
    try:
        token_cipher(settings)
    except IntegrationError:
        return False
    return True


def connection_status(database: Database, user_id: UUID) -> ConnectionStatus:
    with database.session_factory.begin() as session:
        user = users.get_user(session, user_id)
        connection = connections.get_connection(session, user_id)
        if user is None:
            return ConnectionStatus(configured=True)
        return ConnectionStatus(
            configured=True,
            authenticated=True,
            user_id=user.id,
            email=user.email,
            connection_status=connection.status if connection else "disconnected",
        )


def finish_authorization(
    settings: Settings,
    database: Database,
    *,
    code: str,
    state: str,
    code_verifier: str,
    expected_user_id: UUID | None,
) -> UUID:
    flow = create_google_oauth_flow(settings, state=state, code_verifier=code_verifier)
    try:
        flow.fetch_token(code=code, timeout=15)
        credentials = flow.credentials
        granted = credentials.granted_scopes or credentials.scopes or []
        if not set(GMAIL_SCOPES).issubset(granted):
            raise IntegrationError(
                "GMAIL_PERMISSION_DENIED", "Read-only Gmail access is required.", 403
            )
        client = create_gmail_client(credentials)
        try:
            email = get_gmail_profile(client)
        finally:
            client.close()
    except requests.RequestException:
        raise IntegrationError(
            "GOOGLE_UNAVAILABLE", "Google is temporarily unreachable. Try again."
        ) from None
    except OAuth2Error, ValueError:
        raise IntegrationError(
            "OAUTH_FAILED", "Gmail authorization failed. Please try again.", 502
        ) from None
    with database.session_factory.begin() as session:
        user = users.get_user_by_email(session, email)
        if expected_user_id is not None and (user is None or user.id != expected_user_id):
            raise IntegrationError(
                "ACCOUNT_MISMATCH", "Disconnect before choosing another account.", 409
            )
        if user is None:
            user = users.create_user(session, email=email)
        existing = connections.get_connection(session, user.id)
        ciphertext = None
        if credentials.refresh_token:
            ciphertext = encrypt_token(settings, credentials.refresh_token)
        elif existing and existing.encrypted_refresh_token:
            decrypt_token(settings, existing.encrypted_refresh_token)
        else:
            raise IntegrationError(
                "REFRESH_TOKEN_REQUIRED", "Reconnect Gmail and grant consent again.", 409
            )
        connections.save_connection(
            session,
            user.id,
            gmail_address=email,
            scopes=list(granted),
            status="connected",
            encrypted_refresh_token=ciphertext,
        )
        return user.id


def credentials_for_user(settings: Settings, database: Database, user_id: UUID) -> Credentials:
    with database.session_factory.begin() as session:
        connection = connections.get_connection(session, user_id)
        if (
            connection is None
            or connection.status != "connected"
            or not connection.encrypted_refresh_token
        ):
            raise IntegrationError("GMAIL_REAUTH_REQUIRED", "Reconnect Gmail to continue.", 401)
        ciphertext = connection.encrypted_refresh_token
    token = decrypt_token(settings, ciphertext)
    credentials = Credentials(
        token=None,
        refresh_token=token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret.get_secret_value()
        if settings.google_client_secret
        else None,
        scopes=GMAIL_SCOPES,
    )
    try:
        with requests.Session() as transport:
            credentials.refresh(TokenRequest(session=transport))
    except RefreshError as error:
        details = error.args[1] if len(error.args) > 1 and isinstance(error.args[1], dict) else {}
        if details.get("error") == "invalid_grant":
            with database.session_factory.begin() as session:
                connections.update_credentials_if_current(
                    session,
                    user_id,
                    previous_ciphertext=ciphertext,
                    status="reauthorization_required",
                    encrypted_refresh_token=None,
                )
            raise IntegrationError(
                "GMAIL_REAUTH_REQUIRED", "Reconnect Gmail to continue.", 401
            ) from None
        raise IntegrationError("GOOGLE_UNAVAILABLE", "Google is temporarily unavailable.") from None
    except TransportError, requests.RequestException:
        raise IntegrationError("GOOGLE_UNAVAILABLE", "Google is temporarily unavailable.") from None
    replacement = credentials.refresh_token or token
    with database.session_factory.begin() as session:
        if not connections.update_credentials_if_current(
            session,
            user_id,
            previous_ciphertext=ciphertext,
            status="connected",
            encrypted_refresh_token=encrypt_token(settings, replacement),
        ):
            raise IntegrationError(
                "GMAIL_CONNECTION_CHANGED", "Gmail connection changed. Try again.", 409
            )
    return credentials


def disconnect_gmail(settings: Settings, database: Database, user_id: UUID) -> bool:
    with database.session_factory.begin() as session:
        connection = connections.get_connection(session, user_id)
        ciphertext = connection.encrypted_refresh_token if connection else None
        connections.disconnect_connection(session, user_id)
    if not ciphertext:
        return True
    try:
        token = decrypt_token(settings, ciphertext)
        response = requests.post(
            "https://oauth2.googleapis.com/revoke", data={"token": token}, timeout=15
        )
        return response.status_code == 200
    except IntegrationError, requests.RequestException:
        return False

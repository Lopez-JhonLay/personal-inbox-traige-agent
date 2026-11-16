import logging
import time
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
import requests
from cryptography.fernet import Fernet
from google.auth.exceptions import RefreshError, TransportError
from google.oauth2.credentials import Credentials
from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.config import Settings
from app.schemas.gmail_schema import ConnectionStatus
from app.services import auth_service as auth
from app.services.integration_errors import IntegrationError
from app.utils.safe_logging import OAuthLogFilter
from app.utils.token_encryption import decrypt_token, encrypt_token


@pytest.fixture
def auth_settings() -> Settings:
    return Settings(
        _env_file=None,
        secret_key="synthetic-session-key",
        database_url="postgresql://u:p@localhost/test",
        google_client_id="synthetic-client",
        google_client_secret="synthetic-secret",
        token_encryption_key=Fernet.generate_key().decode(),
    )


@pytest.fixture
def client(auth_settings: Settings):
    app = create_app(auth_settings)
    app.config["TESTING"] = True
    return app.test_client()


def test_encryption_and_configuration(auth_settings: Settings) -> None:
    ciphertext = encrypt_token(auth_settings, "synthetic-refresh")
    assert "synthetic-refresh" not in ciphertext
    assert decrypt_token(auth_settings, ciphertext) == "synthetic-refresh"
    with pytest.raises(IntegrationError, match="CREDENTIALS_UNREADABLE"):
        decrypt_token(auth_settings, ciphertext[:-3] + "xxx")
    invalid = auth_settings.model_copy(update={"token_encryption_key": None})
    assert not auth.auth_configured(invalid)
    with pytest.raises(IntegrationError, match="AUTH_NOT_CONFIGURED"):
        encrypt_token(invalid, "synthetic")
    assert not auth.auth_configured(Settings(_env_file=None))


def test_start_oauth_has_pkce_and_readonly_scope(client) -> None:
    response = client.get("/api/auth/google")
    assert response.status_code == 302
    query = parse_qs(urlparse(response.location).query)
    assert query["scope"] == [auth.GMAIL_SCOPES[0]]
    assert query["access_type"] == ["offline"]
    assert query["code_challenge_method"] == ["S256"]
    assert "code_challenge" in query
    assert response.headers["Cache-Control"] == "no-store"
    with client.session_transaction() as session:
        assert query["state"] == [session["oauth"]["state"]]
        assert "code_verifier" not in query


@pytest.mark.parametrize(
    "case,expected",
    [
        ("missing_state", "OAUTH_STATE_INVALID"),
        ("mismatch", "OAUTH_STATE_INVALID"),
        ("expired", "OAUTH_STATE_INVALID"),
        ("denied", "OAUTH_DENIED"),
        ("no_code", "OAUTH_CODE_MISSING"),
        ("unicode", "OAUTH_STATE_INVALID"),
    ],
)
def test_callback_rejects_invalid_requests(client, monkeypatch, case: str, expected: str) -> None:
    finish = Mock()
    monkeypatch.setattr(auth, "finish_authorization", finish)
    with client.session_transaction() as session:
        session["oauth"] = {
            "state": "expected",
            "verifier": "verifier",
            "issued_at": time.time() - (601 if case == "expired" else 0),
        }
    query = {"state": "expected", "code": "synthetic-code"}
    if case == "missing_state":
        query.pop("state")
    if case == "mismatch":
        query["state"] = "wrong"
    if case == "unicode":
        query["state"] = "\u00e9"
    if case == "denied":
        query["error"] = "access_denied"
    if case == "no_code":
        query.pop("code")
    response = client.get("/api/auth/google/callback", query_string=query)
    assert expected in response.location
    finish.assert_not_called()
    with client.session_transaction() as session:
        assert "oauth" not in session


def test_callback_success_session_status_and_disconnect(client, monkeypatch) -> None:
    user_id = uuid4()
    finish = Mock(return_value=user_id)
    monkeypatch.setattr(auth, "finish_authorization", finish)
    client.get("/api/auth/google")
    with client.session_transaction() as session:
        state = session["oauth"]["state"]
    response = client.get(
        "/api/auth/google/callback", query_string={"state": state, "code": "secret-code"}
    )
    assert "gmail=connected" in response.location
    assert "secret-code" not in response.location
    with client.session_transaction() as session:
        assert set(session) == {"_permanent", "user_id", "csrf_token"}
        assert session["user_id"] == str(user_id)
        csrf = session["csrf_token"]
    monkeypatch.setattr(
        auth,
        "connection_status",
        Mock(
            return_value=ConnectionStatus(
                configured=True,
                authenticated=True,
                user_id=user_id,
                email="sample@example.invalid",
                connection_status="connected",
            )
        ),
    )
    status = client.get("/api/auth/status")
    assert status.json["data"]["csrf_token"] == csrf
    disconnect = Mock(return_value=False)
    monkeypatch.setattr(auth, "disconnect_gmail", disconnect)
    assert client.post("/api/auth/disconnect").status_code == 403
    assert client.post("/api/auth/disconnect", headers={"X-CSRF-Token": "wrong"}).status_code == 403
    disconnect.assert_not_called()
    response = client.post("/api/auth/disconnect", headers={"X-CSRF-Token": csrf})
    assert response.json["data"] == {"disconnected": True, "revoked": False}
    with client.session_transaction() as session:
        assert not session
    assert client.post("/api/auth/disconnect").status_code == 401


def test_unconfigured_app_and_safe_database_error(client, monkeypatch) -> None:
    unconfigured = create_app(Settings(_env_file=None)).test_client()
    assert not unconfigured.get("/api/auth/status").json["data"]["configured"]
    assert unconfigured.get("/api/auth/google").status_code == 503
    assert "AUTH_NOT_CONFIGURED" in unconfigured.get("/api/auth/google/callback").location
    with client.session_transaction() as session:
        session["user_id"] = str(uuid4())
    monkeypatch.setattr(auth, "connection_status", Mock(side_effect=SQLAlchemyError("private")))
    response = client.get("/api/auth/status")
    assert response.status_code == 503
    assert b"private" not in response.data


def test_callback_access_log_redacts_query() -> None:
    record = logging.LogRecord(
        "werkzeug",
        logging.INFO,
        "",
        0,
        '"GET %s HTTP/1.1" 302',
        ("/api/auth/google/callback?code=secret&state=private",),
        None,
    )
    assert OAuthLogFilter().filter(record)
    assert "secret" not in record.getMessage()
    assert "private" not in record.getMessage()


def test_expired_session_is_anonymous(client, auth_settings, monkeypatch) -> None:
    serializer = client.application.session_interface.get_signing_serializer(client.application)
    old_time = time.time() - 9 * 3600
    with monkeypatch.context() as patch:
        patch.setattr("itsdangerous.timed.time.time", lambda: old_time)
        cookie = serializer.dumps({"user_id": str(uuid4()), "_permanent": True})
    client.set_cookie("mailkind_session", cookie)
    result = client.get("/api/auth/status")
    assert not result.json["data"]["authenticated"]


def test_cookie_flags_and_csrf_guard(client, monkeypatch) -> None:
    client.application.config["SESSION_COOKIE_SECURE"] = True
    response = client.get("/api/auth/google")
    cookie = response.headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=Lax" in cookie


def test_oauth_provider_failure_is_safe(auth_settings, persistence, monkeypatch) -> None:
    from oauthlib.oauth2 import OAuth2Error

    flow = Mock()
    flow.fetch_token.side_effect = OAuth2Error(description="private token")
    monkeypatch.setattr(auth, "create_google_oauth_flow", Mock(return_value=flow))
    with pytest.raises(IntegrationError, match="OAUTH_FAILED") as error:
        auth.finish_authorization(
            auth_settings,
            persistence[0],
            code="code",
            state="state",
            code_verifier="verifier",
            expected_user_id=None,
        )
    assert "private" not in error.value.message


def test_oauth_transport_failure_has_safe_actionable_code(
    auth_settings, persistence, monkeypatch
) -> None:
    flow = Mock()
    flow.fetch_token.side_effect = requests.exceptions.ProxyError("private proxy details")
    monkeypatch.setattr(auth, "create_google_oauth_flow", Mock(return_value=flow))
    with pytest.raises(IntegrationError, match="GOOGLE_UNAVAILABLE") as error:
        auth.finish_authorization(
            auth_settings,
            persistence[0],
            code="code",
            state="state",
            code_verifier="verifier",
            expected_user_id=None,
        )
    assert "private" not in error.value.message


@pytest.fixture
def persistence(monkeypatch):
    database = Mock()
    session = Mock()

    @contextmanager
    def transaction():
        yield session

    database.session_factory.begin.side_effect = transaction
    user = SimpleNamespace(id=uuid4())
    monkeypatch.setattr(auth.users, "get_user_by_email", Mock(return_value=user))
    monkeypatch.setattr(auth.connections, "get_connection", Mock(return_value=None))
    monkeypatch.setattr(auth.connections, "save_connection", Mock())
    return database, session, user


def authorize(
    monkeypatch,
    settings,
    persistence,
    refresh_token="synthetic-refresh",
    scopes=None,
    expected_user_id=None,
):
    database, _, _ = persistence
    flow = Mock(
        credentials=Credentials(
            token="synthetic-access",
            refresh_token=refresh_token,
            scopes=auth.GMAIL_SCOPES if scopes is None else scopes,
        )
    )
    monkeypatch.setattr(auth, "create_google_oauth_flow", Mock(return_value=flow))
    monkeypatch.setattr(auth, "create_gmail_client", Mock(return_value=Mock()))
    monkeypatch.setattr(auth, "get_gmail_profile", Mock(return_value="sample@example.invalid"))
    return auth.finish_authorization(
        settings,
        database,
        code="code",
        state="state",
        code_verifier="verifier",
        expected_user_id=expected_user_id,
    )


def test_finish_persists_encrypted_token(auth_settings, persistence, monkeypatch) -> None:
    assert authorize(monkeypatch, auth_settings, persistence) == persistence[2].id
    saved = auth.connections.save_connection.call_args.kwargs
    assert decrypt_token(auth_settings, saved["encrypted_refresh_token"]) == "synthetic-refresh"
    assert saved["status"] == "connected"


@pytest.mark.parametrize(
    "case,code",
    [
        ("missing_token", "REFRESH_TOKEN_REQUIRED"),
        ("scope", "GMAIL_PERMISSION_DENIED"),
        ("other_account", "ACCOUNT_MISMATCH"),
    ],
)
def test_finish_failure_cases(auth_settings, persistence, monkeypatch, case, code) -> None:
    with pytest.raises(IntegrationError, match=code):
        authorize(
            monkeypatch,
            auth_settings,
            persistence,
            refresh_token=None if case == "missing_token" else "token",
            scopes=[] if case == "scope" else None,
            expected_user_id=uuid4() if case == "other_account" else None,
        )
    auth.connections.save_connection.assert_not_called()


def test_reconnect_preserves_existing_token(auth_settings, persistence, monkeypatch) -> None:
    ciphertext = encrypt_token(auth_settings, "existing")
    auth.connections.get_connection.return_value = SimpleNamespace(
        encrypted_refresh_token=ciphertext
    )
    authorize(monkeypatch, auth_settings, persistence, refresh_token=None)
    assert auth.connections.save_connection.call_args.kwargs["encrypted_refresh_token"] is None


@pytest.mark.parametrize(
    "failure,code,changes",
    [
        (RefreshError("revoked", {"error": "invalid_grant"}), "GMAIL_REAUTH_REQUIRED", True),
        (
            RefreshError("temporary", {"error": "temporarily_unavailable"}),
            "GOOGLE_UNAVAILABLE",
            False,
        ),
        (TransportError("temporary"), "GOOGLE_UNAVAILABLE", False),
    ],
)
def test_refresh_errors_do_not_erase_transient_credentials(
    auth_settings, persistence, monkeypatch, failure, code, changes
) -> None:
    database, _, user = persistence
    auth.connections.get_connection.return_value = SimpleNamespace(
        status="connected", encrypted_refresh_token=encrypt_token(auth_settings, "old")
    )
    update = Mock(return_value=True)
    monkeypatch.setattr(auth.connections, "update_credentials_if_current", update)
    monkeypatch.setattr(auth.Credentials, "refresh", Mock(side_effect=failure))
    with pytest.raises(IntegrationError, match=code):
        auth.credentials_for_user(auth_settings, database, user.id)
    assert update.called == changes


def test_refresh_rotation_and_disconnect_race(auth_settings, persistence, monkeypatch) -> None:
    database, _, user = persistence
    auth.connections.get_connection.return_value = SimpleNamespace(
        status="connected", encrypted_refresh_token=encrypt_token(auth_settings, "old")
    )

    def refresh(credentials, request):
        credentials._refresh_token = "rotated"
        credentials.token = "access"

    monkeypatch.setattr(auth.Credentials, "refresh", refresh)
    update = Mock(return_value=True)
    monkeypatch.setattr(auth.connections, "update_credentials_if_current", update)
    assert auth.credentials_for_user(auth_settings, database, user.id).token == "access"
    assert (
        decrypt_token(auth_settings, update.call_args.kwargs["encrypted_refresh_token"])
        == "rotated"
    )
    update.return_value = False
    with pytest.raises(IntegrationError, match="GMAIL_CONNECTION_CHANGED"):
        auth.credentials_for_user(auth_settings, database, user.id)


@pytest.mark.parametrize("remote", [200, 503, "timeout"])
def test_disconnect_erases_locally_before_revocation(
    auth_settings, persistence, monkeypatch, remote
) -> None:
    database, session, user = persistence
    auth.connections.get_connection.return_value = SimpleNamespace(
        encrypted_refresh_token=encrypt_token(auth_settings, "old")
    )
    removed = Mock()
    monkeypatch.setattr(auth.connections, "disconnect_connection", removed)

    def revoke(*args, **kwargs):
        removed.assert_called_once_with(session, user.id)
        assert kwargs["data"] == {"token": "old"}
        if remote == "timeout":
            raise requests.Timeout()
        return SimpleNamespace(status_code=remote)

    monkeypatch.setattr(auth.requests, "post", revoke)
    assert auth.disconnect_gmail(auth_settings, database, user.id) == (remote == 200)

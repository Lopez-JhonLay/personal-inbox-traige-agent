import pytest
from google.oauth2.credentials import Credentials

from app import create_app
from app.config import Settings
from app.database import create_database
from app.models import Base
from app.services.ai_service import create_openrouter_client
from app.services.auth_service import GMAIL_SCOPES, create_google_oauth_flow
from app.services.gmail_service import create_gmail_client


def test_health_without_external_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    settings = Settings(_env_file=None)
    app = create_app(settings)
    app.config["TESTING"] = True
    response = app.test_client().get("/api/health")
    assert response.status_code == 200
    assert response.json == {"success": True, "data": {"status": "ok"}}
    assert app.extensions["database"] is None
    assert not Base.metadata.tables


def test_cors_allows_only_configured_origin() -> None:
    app = create_app(Settings(_env_file=None, database_url=None))
    client = app.test_client()
    allowed = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    denied = client.get("/api/health", headers={"Origin": "https://untrusted.example"})
    assert allowed.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert allowed.headers["Access-Control-Allow-Credentials"] == "true"
    assert "Access-Control-Allow-Origin" not in denied.headers


def test_postgres_engine_is_lazy_and_uses_psycopg() -> None:
    database = create_database("postgresql://user:password@localhost/inbox?sslmode=require")
    try:
        assert database.engine.url.drivername == "postgresql+psycopg"
        assert database.engine.url.query["sslmode"] == "require"
        assert database.session_factory.kw["bind"] is database.engine
    finally:
        database.engine.dispose()


def test_openrouter_client_configuration() -> None:
    settings = Settings(_env_file=None, openrouter_api_key="test-key")
    with create_openrouter_client(settings) as client:
        assert str(client.base_url) == "https://openrouter.ai/api/v1/"
        assert client.max_retries == 0


def test_google_clients_construct_without_network_calls() -> None:
    settings = Settings(
        _env_file=None,
        google_client_id="test-client",
        google_client_secret="test-secret",
    )
    flow = create_google_oauth_flow(settings)
    assert tuple(flow.oauth2session.scope) == GMAIL_SCOPES
    assert flow.redirect_uri == settings.google_redirect_uri
    client = create_gmail_client(Credentials(token="test-token"))
    try:
        assert client.users().messages() is not None
    finally:
        client.close()

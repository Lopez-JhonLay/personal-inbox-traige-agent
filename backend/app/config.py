from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    secret_key: SecretStr | None = None
    session_cookie_secure: bool = False
    frontend_url: str = "http://localhost:5173"
    database_url: SecretStr | None = None
    direct_database_url: SecretStr | None = None
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None
    google_redirect_uri: str = "http://localhost:5000/api/auth/google/callback"
    openrouter_api_key: SecretStr | None = None
    openrouter_model: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    token_encryption_key: SecretStr | None = None

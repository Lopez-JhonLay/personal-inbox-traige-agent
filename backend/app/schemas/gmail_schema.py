from datetime import datetime
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GoogleProfile(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    picture: str | None = None

    @field_validator("picture", mode="before")
    @classmethod
    def google_picture(cls, value: object) -> str | None:
        if not isinstance(value, str) or len(value) > 1024:
            return None
        try:
            url = urlsplit(value)
            host = url.hostname or ""
            if (
                url.scheme == "https"
                and host.endswith((".googleusercontent.com", ".ggpht.com"))
                and url.port in (None, 443)
                and not url.username
                and not url.password
            ):
                return value
        except ValueError:
            pass
        return None


class NormalizedEmail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    gmail_message_id: str
    gmail_thread_id: str
    sender: str | None = Field(max_length=320)
    subject: str = Field(max_length=500)
    received_at: datetime
    body: str = Field(max_length=20_000)


class ConnectionStatus(BaseModel):
    configured: bool
    authenticated: bool = False
    user_id: UUID | None = None
    email: str | None = None
    display_name: str | None = None
    picture_url: str | None = None
    connection_status: str = "disconnected"
    csrf_token: str | None = None
    sync_query: str = ""

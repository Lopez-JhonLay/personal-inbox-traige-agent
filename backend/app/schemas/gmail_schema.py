from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
    connection_status: str = "disconnected"
    csrf_token: str | None = None
    sync_query: str = ""

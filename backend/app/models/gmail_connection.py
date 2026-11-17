from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdentityMixin, UpdatedMixin

if TYPE_CHECKING:
    from app.models.email import Email
    from app.models.user import User


class GmailConnection(IdentityMixin, UpdatedMixin, Base):
    __tablename__ = "gmail_connections"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    gmail_address: Mapped[str] = mapped_column(String(255))
    encrypted_refresh_token: Mapped[str | None] = mapped_column(Text)
    scopes: Mapped[list[str]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(30))
    operation_id: Mapped[UUID | None]
    operation_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    user: Mapped[User] = relationship(back_populates="gmail_connection")
    emails: Mapped[list[Email]] = relationship(
        back_populates="gmail_connection", cascade="all, delete-orphan", passive_deletes=True
    )

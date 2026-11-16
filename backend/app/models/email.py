from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedMixin, IdentityMixin

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.email_analysis import EmailAnalysisRecord
    from app.models.gmail_connection import GmailConnection


class Email(IdentityMixin, CreatedMixin, Base):
    __tablename__ = "emails"
    __table_args__ = (
        UniqueConstraint("gmail_connection_id", "gmail_message_id"),
        Index("ix_emails_connection_received", "gmail_connection_id", "received_at", "id"),
    )

    gmail_connection_id: Mapped[UUID] = mapped_column(
        ForeignKey("gmail_connections.id", ondelete="CASCADE")
    )
    gmail_message_id: Mapped[str] = mapped_column(String(255))
    gmail_thread_id: Mapped[str] = mapped_column(String(255))
    sender: Mapped[str | None] = mapped_column(Text)
    subject: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    gmail_connection: Mapped[GmailConnection] = relationship(back_populates="emails")
    analyses: Mapped[list[EmailAnalysisRecord]] = relationship(
        back_populates="email", cascade="all, delete-orphan", passive_deletes=True
    )
    action_items: Mapped[list[ActionItem]] = relationship(
        back_populates="email", cascade="all, delete-orphan", passive_deletes=True
    )

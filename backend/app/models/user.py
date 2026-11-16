from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedMixin, IdentityMixin, UpdatedMixin

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.gmail_connection import GmailConnection


class User(IdentityMixin, CreatedMixin, UpdatedMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True)
    display_name: Mapped[str | None] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(100), server_default="Asia/Manila")
    gmail_connection: Mapped[GmailConnection | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    action_items: Mapped[list[ActionItem]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

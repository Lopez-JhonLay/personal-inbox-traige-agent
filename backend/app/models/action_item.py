from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedMixin, IdentityMixin, UpdatedMixin

if TYPE_CHECKING:
    from app.models.email import Email
    from app.models.user import User

ACTION_STATUSES = ("pending", "in_progress", "completed", "dismissed")


class ActionItem(IdentityMixin, CreatedMixin, UpdatedMixin, Base):
    __tablename__ = "action_items"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'dismissed')", name="status"
        ),
        Index("ix_action_items_user_status_due", "user_id", "status", "due_date"),
        Index("ix_action_items_email_id", "email_id"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    email_id: Mapped[UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"))
    description: Mapped[str] = mapped_column(Text)
    due_date: Mapped[date | None]
    status: Mapped[str] = mapped_column(String(30), server_default="pending")
    user: Mapped[User] = relationship(back_populates="action_items")
    email: Mapped[Email] = relationship(back_populates="action_items")

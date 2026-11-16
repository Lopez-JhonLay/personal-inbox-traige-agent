from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedMixin, IdentityMixin

if TYPE_CHECKING:
    from app.models.email import Email

ANALYSIS_STATUSES = ("pending", "processing", "completed", "failed")


class EmailAnalysisRecord(IdentityMixin, CreatedMixin, Base):
    __tablename__ = "email_analyses"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')", name="status"
        ),
        CheckConstraint("priority IN ('High', 'Medium', 'Low')", name="priority"),
        CheckConstraint(
            "category IN ('Work', 'Personal', 'Finance', 'Meetings', 'Notifications', "
            "'Promotions', 'Newsletters', 'Other')",
            name="category",
        ),
        Index("ix_email_analyses_history", "email_id", "status", "created_at", "id"),
        Index(
            "uq_email_analyses_active",
            "email_id",
            unique=True,
            postgresql_where=text("status IN ('pending', 'processing')"),
        ),
    )

    email_id: Mapped[UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"))
    summary: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(30))
    priority: Mapped[str | None] = mapped_column(String(10))
    deadline: Mapped[date | None]
    deadline_text: Mapped[str | None] = mapped_column(Text)
    requested_action: Mapped[str | None] = mapped_column(Text)
    suggested_action: Mapped[str | None] = mapped_column(Text)
    reply_needed: Mapped[bool | None]
    draft_reply: Mapped[str | None] = mapped_column(Text)
    model_identifier: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), server_default="pending")
    error_code: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[Email] = relationship(back_populates="analyses")

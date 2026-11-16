from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Select, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Email, GmailConnection


def owned_emails(user_id: UUID) -> Select[tuple[Email]]:
    return select(Email).join(GmailConnection).where(GmailConnection.user_id == user_id)


def get_email(session: Session, user_id: UUID, email_id: UUID) -> Email | None:
    return session.scalar(owned_emails(user_id).where(Email.id == email_id))


def require_email(session: Session, user_id: UUID, email_id: UUID) -> Email:
    email = get_email(session, user_id, email_id)
    if email is None:
        raise LookupError("Email not found.")
    return email


def list_emails(
    session: Session, user_id: UUID, *, limit: int = 50, offset: int = 0
) -> list[Email]:
    if not 1 <= limit <= 100 or offset < 0:
        raise ValueError("Use a limit from 1 to 100 and a nonnegative offset.")
    return list(
        session.scalars(
            owned_emails(user_id)
            .order_by(Email.received_at.desc().nulls_last(), Email.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )


def save_email(
    session: Session,
    user_id: UUID,
    *,
    gmail_connection_id: UUID,
    gmail_message_id: str,
    gmail_thread_id: str,
    sender: str | None = None,
    subject: str | None = None,
    body: str | None = None,
    received_at: datetime | None = None,
) -> Email:
    connection = session.scalar(
        select(GmailConnection).where(
            GmailConnection.id == gmail_connection_id, GmailConnection.user_id == user_id
        )
    )
    if connection is None:
        raise LookupError("Gmail connection not found.")
    # The unique constraint and ON CONFLICT also protect concurrent sync requests.
    statement = (
        insert(Email)
        .values(
            id=uuid4(),
            gmail_connection_id=gmail_connection_id,
            gmail_message_id=gmail_message_id,
            gmail_thread_id=gmail_thread_id,
            sender=sender,
            subject=subject,
            body=body,
            received_at=received_at,
        )
        .on_conflict_do_nothing(index_elements=["gmail_connection_id", "gmail_message_id"])
    )
    session.execute(statement)
    return session.scalars(
        owned_emails(user_id).where(
            Email.gmail_connection_id == gmail_connection_id,
            Email.gmail_message_id == gmail_message_id,
        )
    ).one()

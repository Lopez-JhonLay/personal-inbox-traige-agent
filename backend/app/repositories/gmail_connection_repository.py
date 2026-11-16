from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GmailConnection


def get_connection(session: Session, user_id: UUID) -> GmailConnection | None:
    return session.scalar(select(GmailConnection).where(GmailConnection.user_id == user_id))


def save_connection(
    session: Session,
    user_id: UUID,
    *,
    gmail_address: str,
    scopes: list[str],
    status: str,
    encrypted_refresh_token: str | None = None,
) -> GmailConnection:
    """Caller encrypts tokens before persistence; None preserves an existing token.

    Phase 4 owns encryption and reauthorization. This function never accepts a
    plaintext refresh_token parameter or returns credentials through an HTTP API.
    """
    connection = get_connection(session, user_id)
    if connection is None:
        connection = GmailConnection(user_id=user_id)
        session.add(connection)
    connection.gmail_address = gmail_address.strip().lower()
    connection.scopes = list(scopes)
    connection.status = status
    if encrypted_refresh_token is not None:
        connection.encrypted_refresh_token = encrypted_refresh_token
    session.flush()
    return connection


def disconnect_connection(session: Session, user_id: UUID) -> GmailConnection | None:
    connection = get_connection(session, user_id)
    if connection is not None:
        connection.status = "disconnected"
        connection.encrypted_refresh_token = None
        session.flush()
    return connection

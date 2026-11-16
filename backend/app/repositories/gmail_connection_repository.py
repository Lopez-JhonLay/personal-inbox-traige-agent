from uuid import UUID

from sqlalchemy import select, update
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


def update_credentials_if_current(
    session: Session,
    user_id: UUID,
    *,
    previous_ciphertext: str,
    status: str,
    encrypted_refresh_token: str | None,
) -> bool:
    """Do not restore a connection that was disconnected during a provider call."""
    result = session.execute(
        update(GmailConnection)
        .where(
            GmailConnection.user_id == user_id,
            GmailConnection.status == "connected",
            GmailConnection.encrypted_refresh_token == previous_ciphertext,
        )
        .values(status=status, encrypted_refresh_token=encrypted_refresh_token)
    )
    return result.rowcount == 1


def disconnect_connection(session: Session, user_id: UUID) -> GmailConnection | None:
    connection = get_connection(session, user_id)
    if connection is not None:
        connection.status = "disconnected"
        connection.encrypted_refresh_token = None
        session.flush()
    return connection

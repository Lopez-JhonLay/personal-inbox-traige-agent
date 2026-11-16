from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def create_user(
    session: Session, *, email: str, display_name: str | None = None, timezone: str = "Asia/Manila"
) -> User:
    user = User(email=email.strip().lower(), display_name=display_name, timezone=timezone)
    session.add(user)
    session.flush()
    return user


def get_user(session: Session, user_id: UUID) -> User | None:
    return session.get(User, user_id)


def get_user_by_email(session: Session, email: str) -> User | None:
    """For trusted OAuth identity resolution, not an unauthenticated lookup API."""
    return session.scalar(select(User).where(User.email == email.strip().lower()))


def update_profile(
    session: Session, user_id: UUID, *, display_name: str | None, timezone: str
) -> User | None:
    user = get_user(session, user_id)
    if user is not None:
        user.display_name = display_name
        user.timezone = timezone
        session.flush()
    return user

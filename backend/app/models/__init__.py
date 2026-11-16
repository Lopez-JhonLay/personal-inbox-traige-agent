from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared metadata for future models. No tables are defined."""

from dataclasses import dataclass

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import Session, sessionmaker


def postgres_url(value: str) -> URL:
    url = make_url(value)
    if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
        raise ValueError("Use a PostgreSQL connection URL with the psycopg driver.")
    return url.set(drivername="postgresql+psycopg")


@dataclass(frozen=True)
class Database:
    engine: Engine
    session_factory: sessionmaker[Session]


def create_database(url: str) -> Database:
    # Engine construction is lazy: startup does not open a database connection.
    engine = create_engine(postgres_url(url), pool_pre_ping=True)
    return Database(engine=engine, session_factory=sessionmaker(bind=engine))

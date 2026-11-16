from alembic import context
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import URL

from app.config import Settings
from app.database import postgres_url
from app.models import Base

target_metadata = Base.metadata


def migration_url() -> URL:
    settings = Settings()
    if not settings.direct_database_url:
        raise ValueError(
            "Set DIRECT_DATABASE_URL to the Neon direct connection URL for migrations."
        )
    return postgres_url(settings.direct_database_url.get_secret_value())


def run_migrations_offline() -> None:
    context.configure(
        url=migration_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(migration_url(), poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

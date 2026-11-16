from collections.abc import Iterator

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import create_database


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption("--run-db-tests", action="store_true", help="Run rollback-only Neon tests")


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if not config.getoption("--run-db-tests"):
        for item in items:
            if "database" in item.keywords:
                item.add_marker(pytest.mark.skip(reason="Enable explicitly with --run-db-tests"))


@pytest.fixture
def db_session(request: pytest.FixtureRequest) -> Iterator[Session]:
    if not request.config.getoption("--run-db-tests"):
        pytest.skip("Enable explicitly with --run-db-tests")
    settings = Settings()
    if not settings.database_url:
        pytest.fail("Set DATABASE_URL in backend/.env to run Neon tests.")
    database = create_database(settings.database_url.get_secret_value())
    try:
        with database.engine.connect() as connection:
            transaction = connection.begin()
            try:
                # Check the migration without creating or changing any schema.
                assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "0002"
                with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                    yield session
            finally:
                transaction.rollback()
    finally:
        database.engine.dispose()

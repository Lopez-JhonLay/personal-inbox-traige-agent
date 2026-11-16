from io import StringIO
from pathlib import Path
from unittest.mock import Mock

import pytest
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import Index, MetaData, Table
from sqlalchemy.dialects.postgresql import dialect
from sqlalchemy.orm import configure_mappers
from sqlalchemy.schema import AddConstraint, CreateColumn, CreateIndex

from app.models import Base


def migration_config() -> Config:
    return Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))


def test_initial_revision_matches_models(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replay the frozen migration into metadata without connecting to PostgreSQL."""
    configure_mappers()
    script = ScriptDirectory.from_config(migration_config())
    assert script.get_heads() == ["0001"]
    revision = script.get_revision("0001")
    metadata = MetaData()
    operations = Mock()
    operations.f.side_effect = lambda name: name
    operations.create_table.side_effect = lambda name, *args: Table(name, metadata, *args)
    operations.create_index.side_effect = lambda name, table, columns, **kwargs: Index(
        name, *(metadata.tables[table].c[column] for column in columns), **kwargs
    )
    monkeypatch.setattr(revision.module, "op", operations)
    revision.module.upgrade()
    assert set(metadata.tables) == set(Base.metadata.tables)
    for name, model in Base.metadata.tables.items():
        migrated = metadata.tables[name]
        assert [str(CreateColumn(c).compile(dialect=dialect())) for c in migrated.columns] == [
            str(CreateColumn(c).compile(dialect=dialect())) for c in model.columns
        ]
        assert sorted(
            str(AddConstraint(c).compile(dialect=dialect())) for c in migrated.constraints
        ) == (sorted(str(AddConstraint(c).compile(dialect=dialect())) for c in model.constraints))
        assert sorted(str(CreateIndex(i).compile(dialect=dialect())) for i in migrated.indexes) == (
            sorted(str(CreateIndex(i).compile(dialect=dialect())) for i in model.indexes)
        )
    revision.module.downgrade()
    assert [call.args[0] for call in operations.drop_table.call_args_list] == [
        table.name for table in reversed(Base.metadata.sorted_tables)
    ]


def test_upgrade_and_downgrade_render_offline(monkeypatch: pytest.MonkeyPatch) -> None:
    # Override even a real local URL: this test must never use Neon credentials.
    monkeypatch.setenv("DIRECT_DATABASE_URL", "postgresql://example:example@localhost/example")
    config = migration_config()
    output = StringIO()
    config.output_buffer = output
    command.upgrade(config, "head", sql=True)
    sql = output.getvalue()
    assert sql.count("CREATE TABLE") == 6  # Five domain tables plus alembic_version.
    assert "JSONB" in sql
    assert "UNIQUE (gmail_connection_id, gmail_message_id)" in sql
    assert "ON DELETE CASCADE" in sql
    output.seek(0)
    output.truncate()
    command.downgrade(config, "0001:base", sql=True)
    assert output.getvalue().count("DROP TABLE") == 5

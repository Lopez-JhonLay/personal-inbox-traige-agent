"""Record the last fully successful Gmail synchronization.

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("gmail_connections", sa.Column("last_synced_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_column("gmail_connections", "last_synced_at")

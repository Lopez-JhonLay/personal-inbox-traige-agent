"""Add connection operation leases and prevent duplicate active analyses."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("gmail_connections", sa.Column("operation_id", sa.Uuid(), nullable=True))
    op.add_column(
        "gmail_connections",
        sa.Column("operation_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "uq_email_analyses_active",
        "email_analyses",
        ["email_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending', 'processing')"),
    )


def downgrade() -> None:
    op.drop_index("uq_email_analyses_active", table_name="email_analyses")
    op.drop_column("gmail_connections", "operation_expires_at")
    op.drop_column("gmail_connections", "operation_id")

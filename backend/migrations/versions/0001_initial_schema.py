"""Create Mailkind persistence tables.

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("timezone", sa.String(length=100), server_default="Asia/Manila", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_table(
        "gmail_connections",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("gmail_address", sa.String(length=255), nullable=False),
        sa.Column("encrypted_refresh_token", sa.Text(), nullable=True),
        sa.Column("scopes", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_gmail_connections_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gmail_connections")),
        sa.UniqueConstraint("user_id", name=op.f("uq_gmail_connections_user_id")),
    )
    op.create_table(
        "emails",
        sa.Column("gmail_connection_id", sa.Uuid(), nullable=False),
        sa.Column("gmail_message_id", sa.String(length=255), nullable=False),
        sa.Column("gmail_thread_id", sa.String(length=255), nullable=False),
        sa.Column("sender", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["gmail_connection_id"],
            ["gmail_connections.id"],
            name=op.f("fk_emails_gmail_connection_id_gmail_connections"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_emails")),
        sa.UniqueConstraint(
            "gmail_connection_id", "gmail_message_id", name=op.f("uq_emails_gmail_connection_id")
        ),
    )
    op.create_table(
        "action_items",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("email_id", sa.Uuid(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="pending", nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'dismissed')",
            name=op.f("ck_action_items_status"),
        ),
        sa.ForeignKeyConstraint(
            ["email_id"],
            ["emails.id"],
            name=op.f("fk_action_items_email_id_emails"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_action_items_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_action_items")),
    )
    op.create_table(
        "email_analyses",
        sa.Column("email_id", sa.Uuid(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=30), nullable=True),
        sa.Column("priority", sa.String(length=10), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("deadline_text", sa.Text(), nullable=True),
        sa.Column("requested_action", sa.Text(), nullable=True),
        sa.Column("suggested_action", sa.Text(), nullable=True),
        sa.Column("reply_needed", sa.Boolean(), nullable=True),
        sa.Column("draft_reply", sa.Text(), nullable=True),
        sa.Column("model_identifier", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="pending", nullable=False),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "category IN ('Work', 'Personal', 'Finance', 'Meetings', 'Notifications', "
            "'Promotions', 'Newsletters', 'Other')",
            name=op.f("ck_email_analyses_category"),
        ),
        sa.CheckConstraint(
            "priority IN ('High', 'Medium', 'Low')", name=op.f("ck_email_analyses_priority")
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')",
            name=op.f("ck_email_analyses_status"),
        ),
        sa.ForeignKeyConstraint(
            ["email_id"],
            ["emails.id"],
            name=op.f("fk_email_analyses_email_id_emails"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_email_analyses")),
    )
    op.create_index(
        "ix_emails_connection_received",
        "emails",
        ["gmail_connection_id", "received_at", "id"],
        unique=False,
    )
    op.create_index("ix_action_items_email_id", "action_items", ["email_id"], unique=False)
    op.create_index(
        "ix_action_items_user_status_due",
        "action_items",
        ["user_id", "status", "due_date"],
        unique=False,
    )
    op.create_index(
        "ix_email_analyses_history",
        "email_analyses",
        ["email_id", "status", "created_at", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("email_analyses")
    op.drop_table("action_items")
    op.drop_table("emails")
    op.drop_table("gmail_connections")
    op.drop_table("users")

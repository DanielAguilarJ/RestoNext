"""Add paid_at column to orders table

Revision ID: a007_add_paid_at
Revises: a006_fix_missing_columns
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a007_add_paid_at'
down_revision = 'add_self_service_dining'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add paid_at column to orders table
    op.add_column('orders', sa.Column('paid_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove paid_at column from orders table
    op.drop_column('orders', 'paid_at')

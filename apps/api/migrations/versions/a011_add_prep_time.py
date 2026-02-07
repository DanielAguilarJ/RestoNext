"""Add prep_time_minutes to menu_items and order_items

Revision ID: a011_add_prep_time
Revises: a010_ensure_all_enum_values
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a011_add_prep_time'
down_revision = 'a010_ensure_all_enum_values'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add prep_time_minutes to menu_items table (configurable per menu item)
    op.add_column(
        'menu_items',
        sa.Column('prep_time_minutes', sa.Integer(), nullable=True, server_default='15')
    )

    # Add prep_time_minutes to order_items table (denormalized for KDS display)
    op.add_column(
        'order_items',
        sa.Column('prep_time_minutes', sa.Integer(), nullable=True, server_default='15')
    )

    # Make table_id and waiter_id nullable on orders (for self-service / counter orders)
    op.alter_column('orders', 'table_id', existing_type=sa.UUID(), nullable=True)
    op.alter_column('orders', 'waiter_id', existing_type=sa.UUID(), nullable=True)


def downgrade() -> None:
    op.drop_column('order_items', 'prep_time_minutes')
    op.drop_column('menu_items', 'prep_time_minutes')
    # Note: not reverting nullable changes on orders.table_id/waiter_id
    # as they may have NULL values now

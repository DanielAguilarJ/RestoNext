"""Ensure all enum values exist

Revision ID: a010_ensure_all_enum_values
Revises: a009_ensure_ordersource_values
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'a010_ensure_all_enum_values'
down_revision = 'a009_ensure_ordersource_values'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure all enums have the required values
    # "ALTER TYPE ... ADD VALUE IF NOT EXISTS" is supported in PG 12+
    
    enums_to_fix = {
        'orderstatus': [
            'open', 'in_progress', 'ready', 'delivered', 'paid', 'cancelled'
        ],
        'orderitemstatus': [
            'pending', 'preparing', 'ready', 'delivered', 'cancelled'
        ],
        'servicetype': [
            'dine_in', 'delivery', 'take_away', 'drive_thru'
        ],
        'routedestination': [
            'kitchen', 'bar'
        ]
    }
    
    conn = op.get_bind()
    
    for enum_name, values in enums_to_fix.items():
        # First check if the type exists
        type_exists = conn.execute(
            text(f"SELECT 1 FROM pg_type WHERE typname = '{enum_name}'")
        ).scalar()
        
        if not type_exists:
            # Create if doesn't exist which shouldn't happen usually as a008 handles creation
            # but good for safety
            formatted_values = ", ".join([f"'{v}'" for v in values])
            op.execute(f"CREATE TYPE {enum_name} AS ENUM ({formatted_values})")
        else:
            # Add missing values
            for value in values:
                op.execute(text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{value}'"))


def downgrade() -> None:
    # Cannot remove values from ENUM in PostgreSQL easily
    pass

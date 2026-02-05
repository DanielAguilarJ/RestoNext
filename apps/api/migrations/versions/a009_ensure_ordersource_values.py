"""Ensure ordersource enum values exist

Revision ID: a009_ensure_ordersource_values
Revises: a008_fix_order_enums
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'a009_ensure_ordersource_values'
down_revision = 'a008_fix_order_enums'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure ordersource has the required values
    # We use a transaction-safe apporach where possible, but ALTER TYPE ADD VALUE
    # sometimes has restrictions. 
    # 'ALTER TYPE ... ADD VALUE IF NOT EXISTS' is supported in PG 12+
    
    values_to_ensure = ['pos', 'self_service', 'delivery_app', 'kiosk']
    
    # We'll use a raw connection to check/add values
    conn = op.get_bind()
    
    # First check if the type exists
    type_exists = conn.execute(text("SELECT 1 FROM pg_type WHERE typname = 'ordersource'")).scalar()
    
    if not type_exists:
        op.execute("""
            CREATE TYPE ordersource AS ENUM (
                'pos', 'self_service', 'delivery_app', 'kiosk'
            )
        """)
    else:
        # For existing type, try to add values if they don't exist
        for value in values_to_ensure:
            # We use distinct COMMITs for safety in some PG setups if needed, 
            # but usually single migration transaction is fine.
            # Using IF NOT EXISTS is the cleanest way.
            op.execute(text(f"ALTER TYPE ordersource ADD VALUE IF NOT EXISTS '{value}'"))


def downgrade() -> None:
    # Cannot remove values from ENUM in PostgreSQL easily
    pass

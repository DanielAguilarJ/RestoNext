"""Ensure all enum types exist for orders

Revision ID: a008_fix_order_enums
Revises: a007_add_paid_at
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'a008_fix_order_enums'
down_revision = 'a007_add_paid_at'
branch_labels = None
depends_on = None


def enum_exists(enum_name: str) -> bool:
    """Check if a PostgreSQL enum type exists"""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = :name)"
    ), {"name": enum_name})
    return result.scalar()


def upgrade() -> None:
    # Create ordersource enum if it doesn't exist
    if not enum_exists('ordersource'):
        op.execute("""
            CREATE TYPE ordersource AS ENUM (
                'pos', 'self_service', 'delivery_app', 'kiosk'
            )
        """)
    
    # Create orderstatus enum if it doesn't exist
    if not enum_exists('orderstatus'):
        op.execute("""
            CREATE TYPE orderstatus AS ENUM (
                'open', 'in_progress', 'ready', 'delivered', 'paid', 'cancelled'
            )
        """)
    
    # Create servicetype enum if it doesn't exist
    if not enum_exists('servicetype'):
        op.execute("""
            CREATE TYPE servicetype AS ENUM (
                'dine_in', 'delivery', 'take_away', 'drive_thru'
            )
        """)
    
    # Create orderitemstatus enum if it doesn't exist
    if not enum_exists('orderitemstatus'):
        op.execute("""
            CREATE TYPE orderitemstatus AS ENUM (
                'pending', 'preparing', 'ready', 'delivered', 'cancelled'
            )
        """)
    
    # Create routedestination enum if it doesn't exist
    if not enum_exists('routedestination'):
        op.execute("""
            CREATE TYPE routedestination AS ENUM (
                'kitchen', 'bar'
            )
        """)


def downgrade() -> None:
    # We don't drop these enums on downgrade as they may be in use
    pass

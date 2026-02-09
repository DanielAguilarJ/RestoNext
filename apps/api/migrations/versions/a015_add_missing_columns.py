"""Add missing columns: menu_categories.printer_target, tables.adjacent_table_ids

These columns exist in the Python models but were never added to the database
via a migration. This causes 500 errors whenever SQLAlchemy tries to SELECT
from these tables (UndefinedColumn errors).

Affected endpoints:
- GET /menu/categories (printer_target column missing)
- GET /menu/items (JOINs menu_categories → same error)
- POST /menu/categories (printer_target column missing)
- GET /orders (JOINs tables → adjacent_table_ids missing)
- Any endpoint that loads Table objects

Revision ID: a015_add_missing_columns
Revises: a014_normalize_all_enums
Create Date: 2026-02-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql


revision = 'a015_add_missing_columns'
down_revision = 'a014_normalize_all_enums'
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = :table AND column_name = :col
    """), {"table": table_name, "col": column_name})
    return result.scalar() is not None


def enum_exists(enum_name: str) -> bool:
    """Check if a PostgreSQL enum type exists."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM pg_type WHERE typname = :name"
    ), {"name": enum_name})
    return result.scalar() is not None


def upgrade() -> None:
    conn = op.get_bind()

    # =============================================
    # 1. Create printertarget enum if it doesn't exist
    # =============================================
    if not enum_exists('printertarget'):
        conn.execute(text(
            "CREATE TYPE printertarget AS ENUM ('kitchen', 'bar', 'dessert', 'main')"
        ))
    else:
        # Ensure all values exist (in case it was partially created)
        for val in ['kitchen', 'bar', 'dessert', 'main']:
            conn.execute(text(
                f"ALTER TYPE printertarget ADD VALUE IF NOT EXISTS '{val}'"
            ))

    # =============================================
    # 2. Add printer_target to menu_categories
    # =============================================
    if not column_exists('menu_categories', 'printer_target'):
        op.add_column('menu_categories', sa.Column(
            'printer_target',
            sa.Enum('kitchen', 'bar', 'dessert', 'main', name='printertarget', create_type=False),
            nullable=False,
            server_default='kitchen'
        ))

    # =============================================
    # 3. Add adjacent_table_ids to tables
    # =============================================
    if not column_exists('tables', 'adjacent_table_ids'):
        op.add_column('tables', sa.Column(
            'adjacent_table_ids',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default='[]'
        ))


def downgrade() -> None:
    if column_exists('tables', 'adjacent_table_ids'):
        op.drop_column('tables', 'adjacent_table_ids')

    if column_exists('menu_categories', 'printer_target'):
        op.drop_column('menu_categories', 'printer_target')

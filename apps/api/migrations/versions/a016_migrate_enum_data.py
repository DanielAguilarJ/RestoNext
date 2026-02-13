"""Migrate existing row data from UPPERCASE to lowercase enum values

Problem: For enum types where BOTH uppercase and lowercase labels exist
(because a001 created UPPERCASE and a010 added lowercase), a013's
ALTER TYPE RENAME VALUE was SKIPPED (can't rename 'KITCHEN' to 'kitchen'
when 'kitchen' already exists as a separate label).

This means existing rows STILL reference the UPPERCASE enum labels.
After adding values_callable to the models, SQLAlchemy expects lowercase
but the DB returns UPPERCASE → LookupError → 500.

Affected enum types (where both UPPER and lower labels coexist):
- routedestination: KITCHEN/kitchen, BAR/bar
- orderstatus: OPEN/open, IN_PROGRESS/in_progress, etc.
- orderitemstatus: PENDING/pending, PREPARING/preparing, etc.

This migration UPDATEs all existing rows to use lowercase enum labels.

Revision ID: a016_migrate_enum_data
Revises: a015_add_missing_columns
Create Date: 2026-02-09
"""
from alembic import op
from sqlalchemy import text


revision = 'a016_migrate_enum_data'
down_revision = 'a015_add_missing_columns'
branch_labels = None
depends_on = None


# table.column -> {UPPERCASE: lowercase} for all enums where BOTH exist
DATA_UPDATES = [
    # routedestination enum - both UPPER and lower exist
    {
        'table': 'menu_items',
        'column': 'route_to',
        'mapping': {'KITCHEN': 'kitchen', 'BAR': 'bar'},
    },
    {
        'table': 'order_items',
        'column': 'route_to',
        'mapping': {'KITCHEN': 'kitchen', 'BAR': 'bar'},
    },

    # orderstatus enum - both UPPER and lower exist
    {
        'table': 'orders',
        'column': 'status',
        'mapping': {
            'OPEN': 'open',
            'IN_PROGRESS': 'in_progress',
            'READY': 'ready',
            'DELIVERED': 'delivered',
            'PAID': 'paid',
            'CANCELLED': 'cancelled',
        },
    },

    # orderitemstatus enum - both UPPER and lower exist
    {
        'table': 'order_items',
        'column': 'status',
        'mapping': {
            'PENDING': 'pending',
            'PREPARING': 'preparing',
            'READY': 'ready',
            'SERVED': 'served',
            'DELIVERED': 'delivered',
            'CANCELLED': 'cancelled',
        },
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    for update in DATA_UPDATES:
        table = update['table']
        column = update['column']

        # Check if table exists
        table_exists = conn.execute(text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = :t"
        ), {"t": table}).scalar()

        if not table_exists:
            continue

        # Get valid enum labels from pg_enum
        # This prevents "invalid input value for enum" error if the UPPERCASE value
        # doesn't exist in the enum definition (e.g. fresh deploys or already fixed)
        enum_type = conn.execute(text(
            """
            SELECT t.typname
            FROM pg_attribute a
            JOIN pg_type t ON a.atttypid = t.oid
            JOIN pg_class c ON a.attrelid = c.oid
            WHERE c.relname = :table AND a.attname = :column
            """
        ), {"table": table, "column": column}).scalar()

        if not enum_type:
            continue

        valid_labels = [
            row[0] for row in conn.execute(text(
                """
                SELECT e.enumlabel
                FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = :type_name
                """
            ), {"type_name": enum_type}).fetchall()
        ]

        for upper_val, lower_val in update['mapping'].items():
            # ONLY try to update if the UPPERCASE value actually exists in the enum
            # attempting to use a value not in the enum in a WHERE clause causes instant error
            if upper_val not in valid_labels:
                continue

            # Update rows that still reference the UPPERCASE label
            result = conn.execute(text(
                f"UPDATE {table} SET {column} = :lower WHERE {column} = :upper"
            ), {"lower": lower_val, "upper": upper_val})

            if result.rowcount > 0:
                print(f"  ✅ Updated {result.rowcount} rows in {table}.{column}: {upper_val} → {lower_val}")


def downgrade() -> None:
    # No need to reverse - both labels exist, data can be either
    pass

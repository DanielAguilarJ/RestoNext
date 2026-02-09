"""Normalize all enum values to lowercase and ensure pending_payment exists

The initial migration (a001) created enum values in UPPERCASE (e.g. 'OPEN', 'IN_PROGRESS'),
but the Python models use lowercase (e.g. 'open', 'in_progress'). This migration:

1. Renames all UPPERCASE enum values to lowercase across ALL enum types
2. Ensures 'pending_payment' exists in orderstatus
3. Ensures 'served' exists in orderitemstatus
4. Updates existing rows to use lowercase values

This fixes:
- 500 errors on /orders?status=pending_payment (invalid enum value)
- 500 errors on /analytics/operations-pulse (case mismatch in raw SQL)
- Potential silent failures in all raw SQL queries using wrong case

Revision ID: a013_normalize_enum_case
Revises: a012_add_catering_tables
Create Date: 2026-02-09
"""
from alembic import op
from sqlalchemy import text


revision = 'a013_normalize_enum_case'
down_revision = 'a012_add_catering_tables'
branch_labels = None
depends_on = None


# Map of enum type -> { uppercase_label: lowercase_label }
ENUM_RENAMES = {
    'orderstatus': {
        'OPEN': 'open',
        'IN_PROGRESS': 'in_progress',
        'READY': 'ready',
        'DELIVERED': 'delivered',
        'PAID': 'paid',
        'CANCELLED': 'cancelled',
    },
    'orderitemstatus': {
        'PENDING': 'pending',
        'PREPARING': 'preparing',
        'READY': 'ready',
        'SERVED': 'served',
        'DELIVERED': 'delivered',
        'CANCELLED': 'cancelled',
    },
    'tablestatus': {
        'FREE': 'free',
        'OCCUPIED': 'occupied',
        'BILL_REQUESTED': 'bill_requested',
    },
    'userrole': {
        'ADMIN': 'admin',
        'MANAGER': 'manager',
        'WAITER': 'waiter',
        'KITCHEN': 'kitchen',
        'CASHIER': 'cashier',
    },
    'routedestination': {
        'KITCHEN': 'kitchen',
        'BAR': 'bar',
    },
    'splittype': {
        'BY_SEAT': 'by_seat',
        'EVEN': 'even',
        'CUSTOM': 'custom',
    },
    'cfdistatus': {
        'PENDING': 'pending',
        'STAMPED': 'stamped',
        'CANCELLED': 'cancelled',
        'ERROR': 'error',
    },
}

# Values that must exist (may have been added by a010 in lowercase already)
ENSURE_VALUES = {
    'orderstatus': ['open', 'pending_payment', 'in_progress', 'ready', 'delivered', 'paid', 'cancelled'],
    'orderitemstatus': ['pending', 'preparing', 'ready', 'served', 'delivered', 'cancelled'],
    'routedestination': ['kitchen', 'bar'],
    'tablestatus': ['free', 'occupied', 'bill_requested'],
    'userrole': ['admin', 'manager', 'waiter', 'kitchen', 'cashier'],
    'splittype': ['by_seat', 'even', 'custom'],
    'cfdistatus': ['pending', 'stamped', 'cancelled', 'error'],
}


def upgrade() -> None:
    conn = op.get_bind()

    for enum_name, renames in ENUM_RENAMES.items():
        # Check if this enum type exists
        type_exists = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = :name"),
            {"name": enum_name}
        ).scalar()

        if not type_exists:
            continue

        # Get current enum labels
        current_labels = [
            row[0] for row in conn.execute(
                text("""
                    SELECT e.enumlabel
                    FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = :name
                """),
                {"name": enum_name}
            ).fetchall()
        ]

        # Rename UPPERCASE values to lowercase
        for upper_val, lower_val in renames.items():
            if upper_val in current_labels and lower_val not in current_labels:
                # Rename the enum value from UPPERCASE to lowercase
                conn.execute(
                    text(f"ALTER TYPE {enum_name} RENAME VALUE '{upper_val}' TO '{lower_val}'")
                )

    # Now ensure all required values exist (e.g. pending_payment)
    for enum_name, values in ENSURE_VALUES.items():
        type_exists = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = :name"),
            {"name": enum_name}
        ).scalar()

        if not type_exists:
            continue

        for value in values:
            # ADD VALUE IF NOT EXISTS is safe — won't error if already present
            conn.execute(
                text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{value}'")
            )


def downgrade() -> None:
    # Cannot easily reverse enum renames in PostgreSQL
    # The lowercase values are the correct ones matching the Python models
    pass

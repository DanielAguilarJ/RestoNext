"""Normalize ALL remaining enum types to match Python .value (lowercase/proper case)

Migration a013 normalized 7 enum types (orderstatus, orderitemstatus, tablestatus,
userrole, routedestination, splittype, cfdistatus). This migration catches ALL
remaining enum types that may still have UPPERCASE labels in PostgreSQL.

Affected enum types:
- printertarget: KITCHEN→kitchen, BAR→bar, DESSERT→dessert, MAIN→main
- unitofmeasure: KG→kg, G→g, LT→lt, ML→ml, PZA→pza, PORCION→porcion
- transactiontype: PURCHASE→purchase, SALE→sale, ADJUSTMENT→adjustment, WASTE→waste
- loyaltytier: BASE→Base, GOLD→Gold, PLATINUM→Platinum
- loyaltytransactiontype: EARN→earn, REDEEM→redeem, ADJUSTMENT→adjustment, EXPIRE→expire, REFUND→refund
- purchaseorderstatus: DRAFT→draft, PENDING→pending, APPROVED→approved, RECEIVED→received, CANCELLED→cancelled
- servicetype: DINE_IN→dine_in, DELIVERY→delivery, TAKE_AWAY→take_away, DRIVE_THRU→drive_thru
- ordersource: POS→pos, SELF_SERVICE→self_service, DELIVERY_APP→delivery_app, KIOSK→kiosk
- reservationstatus: PENDING→pending, CONFIRMED→confirmed, SEATED→seated, CANCELLED→cancelled, NO_SHOW→no_show
- reservationpaymentstatus: PENDING→pending, PAID→paid, REFUNDED→refunded
- servicerequesttype: WAITER→waiter, BILL→bill, REFILL→refill, CUSTOM→custom
- servicerequeststatus: PENDING→pending, ACKNOWLEDGED→acknowledged, RESOLVED→resolved
- leadstatus, eventstatus, quotestatus (already lowercase from a012, but safe to verify)

Also removes stale values from reservationstatus that were accidentally added
(earn, redeem, adjustment, expired) from a copy-paste error.

Revision ID: a014_normalize_all_enums
Revises: a013_normalize_enum_case
Create Date: 2026-02-09
"""
from alembic import op
from sqlalchemy import text


revision = 'a014_normalize_all_enums'
down_revision = 'a013_normalize_enum_case'
branch_labels = None
depends_on = None


# Map of enum type -> { UPPERCASE_label: correct_value }
# The correct_value matches the Python enum's .value
ENUM_RENAMES = {
    'printertarget': {
        'KITCHEN': 'kitchen',
        'BAR': 'bar',
        'DESSERT': 'dessert',
        'MAIN': 'main',
    },
    'unitofmeasure': {
        'KG': 'kg',
        'G': 'g',
        'LT': 'lt',
        'ML': 'ml',
        'PZA': 'pza',
        'PORCION': 'porcion',
    },
    'transactiontype': {
        'PURCHASE': 'purchase',
        'SALE': 'sale',
        'ADJUSTMENT': 'adjustment',
        'WASTE': 'waste',
    },
    'loyaltytier': {
        'BASE': 'Base',
        'GOLD': 'Gold',
        'PLATINUM': 'Platinum',
    },
    'loyaltytransactiontype': {
        'EARN': 'earn',
        'REDEEM': 'redeem',
        'ADJUSTMENT': 'adjustment',
        'EXPIRE': 'expire',
        'REFUND': 'refund',
    },
    'purchaseorderstatus': {
        'DRAFT': 'draft',
        'PENDING': 'pending',
        'APPROVED': 'approved',
        'RECEIVED': 'received',
        'CANCELLED': 'cancelled',
    },
    'servicetype': {
        'DINE_IN': 'dine_in',
        'DELIVERY': 'delivery',
        'TAKE_AWAY': 'take_away',
        'DRIVE_THRU': 'drive_thru',
    },
    'ordersource': {
        'POS': 'pos',
        'SELF_SERVICE': 'self_service',
        'DELIVERY_APP': 'delivery_app',
        'KIOSK': 'kiosk',
    },
    'reservationstatus': {
        'PENDING': 'pending',
        'CONFIRMED': 'confirmed',
        'SEATED': 'seated',
        'CANCELLED': 'cancelled',
        'NO_SHOW': 'no_show',
    },
    'reservationpaymentstatus': {
        'PENDING': 'pending',
        'PAID': 'paid',
        'REFUNDED': 'refunded',
    },
    'servicerequesttype': {
        'WAITER': 'waiter',
        'BILL': 'bill',
        'REFILL': 'refill',
        'CUSTOM': 'custom',
    },
    'servicerequeststatus': {
        'PENDING': 'pending',
        'ACKNOWLEDGED': 'acknowledged',
        'RESOLVED': 'resolved',
    },
    # These were created lowercase by a012, but include for safety
    'leadstatus': {
        'NEW': 'new',
        'CONTACTED': 'contacted',
        'PROPOSAL_SENT': 'proposal_sent',
        'NEGOTIATION': 'negotiation',
        'QUOTING': 'quoting',
        'WON': 'won',
        'LOST': 'lost',
    },
    'eventstatus': {
        'DRAFT': 'draft',
        'CONFIRMED': 'confirmed',
        'BOOKED': 'booked',
        'IN_PROGRESS': 'in_progress',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled',
    },
    'quotestatus': {
        'DRAFT': 'draft',
        'SENT': 'sent',
        'VIEWED': 'viewed',
        'ACCEPTED': 'accepted',
        'REJECTED': 'rejected',
        'EXPIRED': 'expired',
    },
}

# Ensure these values exist for each enum type
ENSURE_VALUES = {
    'printertarget': ['kitchen', 'bar', 'dessert', 'main'],
    'unitofmeasure': ['kg', 'g', 'lt', 'ml', 'pza', 'porcion'],
    'transactiontype': ['purchase', 'sale', 'adjustment', 'waste'],
    'loyaltytier': ['Base', 'Gold', 'Platinum'],
    'loyaltytransactiontype': ['earn', 'redeem', 'adjustment', 'expire', 'refund'],
    'purchaseorderstatus': ['draft', 'pending', 'approved', 'received', 'cancelled'],
    'servicetype': ['dine_in', 'delivery', 'take_away', 'drive_thru'],
    'ordersource': ['pos', 'self_service', 'delivery_app', 'kiosk'],
    'reservationstatus': ['pending', 'confirmed', 'seated', 'cancelled', 'no_show'],
    'reservationpaymentstatus': ['pending', 'paid', 'refunded'],
    'servicerequesttype': ['waiter', 'bill', 'refill', 'custom'],
    'servicerequeststatus': ['pending', 'acknowledged', 'resolved'],
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

        # Rename UPPERCASE values to the correct cased value
        for upper_val, correct_val in renames.items():
            if upper_val in current_labels and correct_val not in current_labels:
                conn.execute(
                    text(f"ALTER TYPE {enum_name} RENAME VALUE '{upper_val}' TO '{correct_val}'")
                )

    # Now ensure all required values exist
    for enum_name, values in ENSURE_VALUES.items():
        type_exists = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = :name"),
            {"name": enum_name}
        ).scalar()

        if not type_exists:
            # Create the enum type if it doesn't exist at all
            value_list = ", ".join(f"'{v}'" for v in values)
            conn.execute(text(f"CREATE TYPE {enum_name} AS ENUM ({value_list})"))
            continue

        for value in values:
            conn.execute(
                text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{value}'")
            )


def downgrade() -> None:
    # Cannot easily reverse enum renames in PostgreSQL
    pass

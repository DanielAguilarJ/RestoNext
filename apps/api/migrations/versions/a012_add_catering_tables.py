"""Add catering module tables (event_leads, events, event_menu_selections, beos, catering_quotes, catering_packages)

Revision ID: a012_add_catering_tables
Revises: a011_add_prep_time
Create Date: 2026-02-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a012_add_catering_tables'
down_revision = 'a011_add_prep_time'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name):
    """Check if a table already exists in the database."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"
        ),
        {"t": table_name},
    )
    return result.scalar()


def ensure_enum(enum_name, values):
    """Ensure a PostgreSQL enum type exists with the given values."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = :name"),
        {"name": enum_name},
    )
    if not result.scalar():
        value_list = ", ".join(f"'{v}'" for v in values)
        conn.execute(sa.text(f"CREATE TYPE {enum_name} AS ENUM ({value_list})"))


def upgrade() -> None:
    # Create enums first
    ensure_enum('leadstatus', [
        'new', 'contacted', 'proposal_sent', 'negotiation', 'quoting', 'won', 'lost'
    ])
    ensure_enum('eventstatus', [
        'draft', 'confirmed', 'booked', 'in_progress', 'completed', 'cancelled'
    ])
    ensure_enum('quotestatus', [
        'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
    ])

    # --- Event Leads (CRM) ---
    if not table_exists('event_leads'):
        op.create_table(
            'event_leads',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('client_name', sa.String(length=128), nullable=False),
            sa.Column('contact_email', sa.String(length=255), nullable=True),
            sa.Column('contact_phone', sa.String(length=20), nullable=True),
            sa.Column('event_date', sa.DateTime(), nullable=True),
            sa.Column('guest_count', sa.Integer(), nullable=True),
            sa.Column('event_type', sa.String(length=64), nullable=True),
            sa.Column('status', sa.Enum(
                'new', 'contacted', 'proposal_sent', 'negotiation', 'quoting', 'won', 'lost',
                name='leadstatus', create_type=False
            ), nullable=False, server_default='new'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('source', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Events ---
    if not table_exists('events'):
        op.create_table(
            'events',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('lead_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('start_time', sa.DateTime(), nullable=False),
            sa.Column('end_time', sa.DateTime(), nullable=False),
            sa.Column('guest_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('location', sa.String(length=255), nullable=True),
            sa.Column('status', sa.Enum(
                'draft', 'confirmed', 'booked', 'in_progress', 'completed', 'cancelled',
                name='eventstatus', create_type=False
            ), nullable=False, server_default='draft'),
            sa.Column('total_amount', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
            sa.ForeignKeyConstraint(['lead_id'], ['event_leads.id']),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Event Menu Selections ---
    if not table_exists('event_menu_selections'):
        op.create_table(
            'event_menu_selections',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('menu_item_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('item_name', sa.String(length=128), nullable=False),
            sa.Column('unit_price', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(['event_id'], ['events.id']),
            sa.ForeignKeyConstraint(['menu_item_id'], ['menu_items.id']),
            sa.PrimaryKeyConstraint('id')
        )

    # --- BEOs (Banquet Event Orders) ---
    if not table_exists('beos'):
        op.create_table(
            'beos',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('schedule', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
            sa.Column('setup_instructions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
            sa.Column('internal_notes', sa.Text(), nullable=True),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['event_id'], ['events.id']),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Catering Quotes ---
    if not table_exists('catering_quotes'):
        op.create_table(
            'catering_quotes',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('valid_until', sa.DateTime(), nullable=False),
            sa.Column('status', sa.Enum(
                'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired',
                name='quotestatus', create_type=False
            ), nullable=False, server_default='draft'),
            sa.Column('public_token', sa.String(length=64), nullable=False, unique=True),
            sa.Column('subtotal', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('tax', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('total', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('deposit_percentage', sa.Float(), nullable=False, server_default='50.0'),
            sa.Column('deposit_amount', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('deposit_paid', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
            sa.Column('paid_at', sa.DateTime(), nullable=True),
            sa.Column('signature_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('signed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['event_id'], ['events.id']),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Catering Packages ---
    if not table_exists('catering_packages'):
        op.create_table(
            'catering_packages',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=128), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('items', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
            sa.Column('base_price_per_person', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('min_guests', sa.Integer(), nullable=False, server_default='20'),
            sa.Column('max_guests', sa.Integer(), nullable=True),
            sa.Column('category', sa.String(length=64), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    op.drop_table('catering_packages')
    op.drop_table('catering_quotes')
    op.drop_table('beos')
    op.drop_table('event_menu_selections')
    op.drop_table('events')
    op.drop_table('event_leads')
    # Note: enums are not dropped to avoid breaking other potential references

"""Fix missing cash tables migration

Revision ID: a017_fix_missing_cash_tables
Revises: a016_migrate_enum_data
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a017_fix_missing_cash_tables'
down_revision = 'a016_migrate_enum_data'
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    """Check if a table exists"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"SELECT 1 FROM information_schema.tables WHERE table_name = '{table_name}'"))
    return result.fetchone() is not None


def enum_exists(enum_name: str) -> bool:
    """Check if an enum type exists"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"SELECT 1 FROM pg_type WHERE typname = '{enum_name}'"))
    return result.fetchone() is not None


def ensure_enum(name: str, values: list):
    """Ensure an enum exists, creating it if not"""
    if not enum_exists(name):
        enum_type = postgresql.ENUM(*values, name=name)
        enum_type.create(op.get_bind())


def upgrade() -> None:
    # Ensure Enums
    ensure_enum('shiftstatus', ['open', 'closed'])
    ensure_enum('cashtransactiontype', ['sale', 'drop', 'payout', 'adjustment'])
    ensure_enum('paymentmethod', ['cash', 'card', 'transfer', 'other'])

    # --- Cash Shifts ---
    if not table_exists('cash_shifts'):
        op.create_table(
            'cash_shifts',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('register_id', sa.String(length=32), nullable=True),
            sa.Column('opened_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('closed_at', sa.DateTime(), nullable=True),
            sa.Column('opening_amount', sa.Float(), nullable=False, server_default='0'),
            sa.Column('total_sales', sa.Float(), nullable=False, server_default='0'),
            sa.Column('cash_sales', sa.Float(), nullable=False, server_default='0'),
            sa.Column('card_sales', sa.Float(), nullable=False, server_default='0'),
            sa.Column('transfer_sales', sa.Float(), nullable=False, server_default='0'),
            sa.Column('total_drops', sa.Float(), nullable=False, server_default='0'),
            sa.Column('total_tips', sa.Float(), nullable=False, server_default='0'),
            sa.Column('expected_cash', sa.Float(), nullable=False, server_default='0'),
            sa.Column('real_cash', sa.Float(), nullable=False, server_default='0'),
            sa.Column('difference', sa.Float(), nullable=False, server_default='0'),
            sa.Column('cash_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('status', postgresql.ENUM('open', 'closed', name='shiftstatus', create_type=False), nullable=False, server_default='open'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Cash Transactions ---
    if not table_exists('cash_transactions'):
        op.create_table(
            'cash_transactions',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('shift_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('transaction_type', postgresql.ENUM('sale', 'drop', 'payout', 'adjustment', name='cashtransactiontype', create_type=False), nullable=False),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('payment_method', postgresql.ENUM('cash', 'card', 'transfer', 'other', name='paymentmethod', create_type=False), nullable=True),
            sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('tip_amount', sa.Float(), nullable=False, server_default='0'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
            sa.ForeignKeyConstraint(['shift_id'], ['cash_shifts.id'], ),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    if table_exists('cash_transactions'):
        op.drop_table('cash_transactions')
    if table_exists('cash_shifts'):
        op.drop_table('cash_shifts')
    
    # Drop enums
    if enum_exists('paymentmethod'):
        op.execute("DROP TYPE paymentmethod")
    if enum_exists('cashtransactiontype'):
        op.execute("DROP TYPE cashtransactiontype")
    if enum_exists('shiftstatus'):
        op.execute("DROP TYPE shiftstatus")

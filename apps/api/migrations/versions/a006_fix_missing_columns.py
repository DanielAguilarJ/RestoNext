"""Fix missing columns causing scheduler failures

Revision ID: a006_fix_missing_columns
Revises: a005_add_pin_hash
Create Date: 2026-01-17

This migration fixes production scheduler job failures by adding:
1. orders.customer_id - For omnichannel customer tracking
2. orders.service_type, delivery_info - For delivery support
3. tenants.active_addons, features_config - If not already present
4. loyalty_transactions.expires_at, processed_for_expiry - For points expiration
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a006_fix_missing_columns'
down_revision = 'a005_add_pin_hash'
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '{table_name}' 
        AND column_name = '{column_name}'
    """))
    return result.fetchone() is not None


def enum_exists(enum_name: str) -> bool:
    """Check if an enum type exists"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"""
        SELECT 1 FROM pg_type WHERE typname = '{enum_name}'
    """))
    return result.fetchone() is not None


def upgrade() -> None:
    # ============================================
    # Add ServiceType enum if not exists
    # ============================================
    if not enum_exists('servicetype'):
        service_type_enum = postgresql.ENUM(
            'dine_in', 'delivery', 'take_away', 'drive_thru',
            name='servicetype',
            create_type=True
        )
        service_type_enum.create(op.get_bind())
    
    # ============================================
    # Fix Orders table - add omnichannel columns
    # ============================================
    if not column_exists('orders', 'customer_id'):
        op.add_column('orders', sa.Column(
            'customer_id',
            postgresql.UUID(as_uuid=True),
            nullable=True
        ))
        # Add foreign key only if customers table exists
        conn = op.get_bind()
        customers_exist = conn.execute(sa.text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'customers'"
        )).fetchone()
        if customers_exist:
            op.create_foreign_key(
                'fk_orders_customer_id',
                'orders', 'customers',
                ['customer_id'], ['id']
            )
    
    if not column_exists('orders', 'service_type'):
        op.add_column('orders', sa.Column(
            'service_type',
            sa.Enum('dine_in', 'delivery', 'take_away', 'drive_thru', name='servicetype'),
            nullable=False,
            server_default='dine_in'
        ))
    
    if not column_exists('orders', 'delivery_info'):
        op.add_column('orders', sa.Column(
            'delivery_info',
            postgresql.JSONB(),
            nullable=True
        ))
    
    # ============================================
    # Fix Tenants table - add addon columns if missing
    # (These might already exist from add_self_service_dining)
    # ============================================
    if not column_exists('tenants', 'active_addons'):
        op.add_column('tenants', sa.Column(
            'active_addons',
            postgresql.JSONB(),
            nullable=False,
            server_default='{"self_service": false, "delivery": false, "kds_pro": false}'
        ))
    
    if not column_exists('tenants', 'features_config'):
        op.add_column('tenants', sa.Column(
            'features_config',
            postgresql.JSONB(),
            nullable=False,
            server_default='{}'
        ))
    
    # ============================================
    # Fix loyalty_transactions table - add expiration columns
    # ============================================
    if column_exists('loyalty_transactions', 'id'):
        # Table exists, check for missing columns
        if not column_exists('loyalty_transactions', 'expires_at'):
            op.add_column('loyalty_transactions', sa.Column(
                'expires_at',
                sa.DateTime(),
                nullable=True
            ))
        
        if not column_exists('loyalty_transactions', 'processed_for_expiry'):
            op.add_column('loyalty_transactions', sa.Column(
                'processed_for_expiry',
                sa.Boolean(),
                nullable=False,
                server_default='false'
            ))


def downgrade() -> None:
    # Remove loyalty_transactions columns
    if column_exists('loyalty_transactions', 'processed_for_expiry'):
        op.drop_column('loyalty_transactions', 'processed_for_expiry')
    
    if column_exists('loyalty_transactions', 'expires_at'):
        op.drop_column('loyalty_transactions', 'expires_at')
    
    # Note: Not removing tenants columns as they might have been added by another migration
    
    # Remove orders columns
    if column_exists('orders', 'delivery_info'):
        op.drop_column('orders', 'delivery_info')
    
    if column_exists('orders', 'service_type'):
        op.drop_column('orders', 'service_type')
    
    if column_exists('orders', 'customer_id'):
        op.drop_constraint('fk_orders_customer_id', 'orders', type_='foreignkey')
        op.drop_column('orders', 'customer_id')

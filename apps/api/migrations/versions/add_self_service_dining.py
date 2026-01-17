"""Add Auto-Service / Self-Service Dining Module

Revision ID: add_self_service_dining
Revises: (previous_revision)
Create Date: 2026-01-15

This migration adds support for:
1. Table QR Token for secure tableside ordering
2. Tenant Add-on management (feature flags)
3. Order source tracking (POS vs Self-Service)
4. Service Requests (call waiter, request bill)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_self_service_dining'
down_revision = 'a006_fix_missing_columns'  # Chain after the missing columns fix
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


def table_exists(table_name: str) -> bool:
    """Check if a table exists"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"""
        SELECT 1 FROM information_schema.tables WHERE table_name = '{table_name}'
    """))
    return result.fetchone() is not None


def index_exists(table_name: str, index_name: str) -> bool:
    """Check if an index exists"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"""
        SELECT 1 FROM pg_indexes 
        WHERE tablename = '{table_name}' 
        AND indexname = '{index_name}'
    """))
    return result.fetchone() is not None


def upgrade() -> None:
    # ============================================
    # Update Tables table with QR token fields
    # ============================================
    if not column_exists('tables', 'qr_secret_token'):
        op.add_column('tables', sa.Column(
            'qr_secret_token', 
            postgresql.UUID(as_uuid=True), 
            nullable=False,
            server_default=sa.text('gen_random_uuid()')
        ))
    
    if not column_exists('tables', 'qr_token_generated_at'):
        op.add_column('tables', sa.Column(
            'qr_token_generated_at', 
            sa.DateTime(), 
            nullable=False,
            server_default=sa.text('NOW()')
        ))
    
    if not column_exists('tables', 'self_service_enabled'):
        op.add_column('tables', sa.Column(
            'self_service_enabled', 
            sa.Boolean(), 
            nullable=False,
            server_default=sa.text('true')
        ))
    
    # ============================================
    # Update Tenants table with add-on management
    # (These might already be added by a006_fix_missing_columns)
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
    # Update Orders table with source tracking
    # ============================================
    # Create enum type for order source if not exists
    if not enum_exists('ordersource'):
        order_source_enum = postgresql.ENUM(
            'pos', 'self_service', 'delivery_app', 'kiosk',
            name='ordersource',
            create_type=True
        )
        order_source_enum.create(op.get_bind())
    
    if not column_exists('orders', 'order_source'):
        op.add_column('orders', sa.Column(
            'order_source', 
            sa.Enum('pos', 'self_service', 'delivery_app', 'kiosk', name='ordersource'),
            nullable=False,
            server_default='pos'
        ))
    
    if not column_exists('orders', 'guest_session_id'):
        op.add_column('orders', sa.Column(
            'guest_session_id', 
            sa.String(64), 
            nullable=True
        ))
    
    # ============================================
    # Create Service Requests table if not exists
    # ============================================
    if not table_exists('service_requests'):
        # Create enum types if not exist
        if not enum_exists('servicerequesttype'):
            service_request_type_enum = postgresql.ENUM(
                'waiter', 'bill', 'refill', 'custom',
                name='servicerequesttype',
                create_type=True
            )
            service_request_type_enum.create(op.get_bind())
        
        if not enum_exists('servicerequeststatus'):
            service_request_status_enum = postgresql.ENUM(
                'pending', 'acknowledged', 'resolved',
                name='servicerequeststatus',
                create_type=True
            )
            service_request_status_enum.create(op.get_bind())
        
        op.create_table(
            'service_requests',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('table_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tables.id'), nullable=False),
            sa.Column('request_type', sa.Enum('waiter', 'bill', 'refill', 'custom', name='servicerequesttype'), nullable=False),
            sa.Column('status', sa.Enum('pending', 'acknowledged', 'resolved', name='servicerequeststatus'), nullable=False, server_default='pending'),
            sa.Column('message', sa.Text(), nullable=True),
            sa.Column('resolved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('resolved_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        )
        
        # Create index for efficient queries
        op.create_index(
            'ix_service_requests_table_status',
            'service_requests',
            ['table_id', 'status']
        )
        op.create_index(
            'ix_service_requests_tenant_created',
            'service_requests',
            ['tenant_id', 'created_at']
        )


def downgrade() -> None:
    # Drop service_requests table
    if table_exists('service_requests'):
        if index_exists('service_requests', 'ix_service_requests_tenant_created'):
            op.drop_index('ix_service_requests_tenant_created', table_name='service_requests')
        if index_exists('service_requests', 'ix_service_requests_table_status'):
            op.drop_index('ix_service_requests_table_status', table_name='service_requests')
        op.drop_table('service_requests')
    
    # Drop enum types
    if enum_exists('servicerequeststatus'):
        op.execute('DROP TYPE IF EXISTS servicerequeststatus')
    if enum_exists('servicerequesttype'):
        op.execute('DROP TYPE IF EXISTS servicerequesttype')
    
    # Remove order columns
    if column_exists('orders', 'guest_session_id'):
        op.drop_column('orders', 'guest_session_id')
    if column_exists('orders', 'order_source'):
        op.drop_column('orders', 'order_source')
    
    if enum_exists('ordersource'):
        op.execute('DROP TYPE IF EXISTS ordersource')
    
    # Remove tenant columns
    if column_exists('tenants', 'features_config'):
        op.drop_column('tenants', 'features_config')
    if column_exists('tenants', 'active_addons'):
        op.drop_column('tenants', 'active_addons')
    
    # Remove table columns
    if column_exists('tables', 'self_service_enabled'):
        op.drop_column('tables', 'self_service_enabled')
    if column_exists('tables', 'qr_token_generated_at'):
        op.drop_column('tables', 'qr_token_generated_at')
    if column_exists('tables', 'qr_secret_token'):
        op.drop_column('tables', 'qr_secret_token')


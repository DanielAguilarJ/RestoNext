"""
RestoNext MX - Database Performance & Legal Compliance Migration
================================================================
Alembic revision: a004_preflight_optimization

Revision ID: a004_preflight_optimization
Revises: a003_add_procurement
Create Date: 2026-01-16

This migration adds:
1. Performance indices for Order, InventoryTransaction, and Customer tables
   - Critical for Analytics queries (get_sales_trends)
   - Critical for Stock level queries
   - Critical for Customer CRM lookups

2. Legal compliance tables (LegalDocument, LegalAcceptance)
   - Required for Stripe compliance
   - Versioned terms acceptance tracking
   - IP address audit trail
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a004_preflight_optimization'
down_revision = 'a003_add_procurement'
branch_labels = None
depends_on = None


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
    """
    Apply pre-flight optimizations:
    1. Create performance indices
    2. Create legal compliance tables
    """
    
    # ============================================
    # PHASE 1: Performance Indices
    # ============================================
    
    # Order table indices - Critical for Analytics
    if not index_exists('orders', 'idx_order_tenant_date'):
        op.create_index(
            'idx_order_tenant_date',
            'orders',
            ['tenant_id', 'created_at'],
            unique=False
        )
    
    if not index_exists('orders', 'idx_order_tenant_status'):
        op.create_index(
            'idx_order_tenant_status',
            'orders',
            ['tenant_id', 'status'],
            unique=False
        )
    
    if not index_exists('orders', 'idx_order_table_status'):
        op.create_index(
            'idx_order_table_status',
            'orders',
            ['table_id', 'status'],
            unique=False
        )
    
    # InventoryTransaction indices - Critical for Stock queries
    if not index_exists('inventory_transactions', 'idx_inv_tenant_ingredient'):
        op.create_index(
            'idx_inv_tenant_ingredient',
            'inventory_transactions',
            ['tenant_id', 'ingredient_id'],
            unique=False
        )
    
    if not index_exists('inventory_transactions', 'idx_inv_tenant_date'):
        op.create_index(
            'idx_inv_tenant_date',
            'inventory_transactions',
            ['tenant_id', 'created_at'],
            unique=False
        )
    
    if not index_exists('inventory_transactions', 'idx_inv_ingredient_type'):
        op.create_index(
            'idx_inv_ingredient_type',
            'inventory_transactions',
            ['ingredient_id', 'transaction_type'],
            unique=False
        )
    
    # Customer table indices - CRM lookups
    # Only try to create if customers table exists (might be created in a different flow or earlier)
    # Check if customers table exists first?
    # Assuming customers table exists as 'orders' FK depends on it? No wait, 'orders' foreign key to customers was added in a006.
    # So customers table might NOT exist yet if it came from somewhere else?
    # But a001 didn't create customers.
    # 47d90 (empty)
    # a003 (procurement)
    # Where is 'customers' created?
    # Maybe it was created in a skipped migration or I missed it?
    # Or maybe 'users' handles customers?
    # Wait, a006 adds `orders.customer_id` which refs `customers`.
    # And it explicitly checks if `customers` exists.
    # So `customers` is an optional table or comes from a different migration I haven't seen listed?
    # Let's check `table_exists('customers')` before creating indexes.
    
    if table_exists('customers'):
        if not index_exists('customers', 'idx_customer_tenant_email'):
            op.create_index(
                'idx_customer_tenant_email',
                'customers',
                ['tenant_id', 'email'],
                unique=False
            )
        
        if not index_exists('customers', 'idx_customer_tenant_phone'):
            op.create_index(
                'idx_customer_tenant_phone',
                'customers',
                ['tenant_id', 'phone'],
                unique=False
            )
        
        if not index_exists('customers', 'idx_customer_tenant_name'):
            op.create_index(
                'idx_customer_tenant_name',
                'customers',
                ['tenant_id', 'name'],
                unique=False
            )
    
    # ============================================
    # PHASE 2: Legal Compliance Tables (Stripe Ready)
    # ============================================
    
    # Create legal_documents table
    if not table_exists('legal_documents'):
        op.create_table(
            'legal_documents',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('type', sa.String(32), nullable=False),
            sa.Column('version', sa.String(20), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('effective_date', sa.DateTime(), nullable=False),
            sa.Column('is_current', sa.Boolean(), default=False),
            sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
            sa.UniqueConstraint('type', 'version', name='uq_legal_doc_type_version'),
        )
    
    # Create index on legal_documents
    if index_exists('legal_documents', 'idx_legal_doc_type_current') is False:
        # Check table first to avoid error if table creation failed? 
        # But if table creation was skipped because it exists, index might check is valid.
        op.create_index(
            'idx_legal_doc_type_current',
            'legal_documents',
            ['type', 'is_current'],
            unique=False
        )
    
    # Create legal_acceptances table
    if not table_exists('legal_acceptances'):
        op.create_table(
            'legal_acceptances',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('customer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('customers.id'), nullable=True),
            sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('legal_documents.id'), nullable=False),
            sa.Column('accepted_at', sa.DateTime(), default=sa.func.now()),
            sa.Column('ip_address', sa.String(45), nullable=True),  # IPv6 max length
            sa.Column('user_agent', sa.String(500), nullable=True),
        )
    
    if table_exists('legal_acceptances'):
        if not index_exists('legal_acceptances', 'idx_legal_accept_user_doc'):
            op.create_index(
                'idx_legal_accept_user_doc',
                'legal_acceptances',
                ['user_id', 'document_id'],
                unique=False
            )
        
        if not index_exists('legal_acceptances', 'idx_legal_accept_customer_doc'):
            op.create_index(
                'idx_legal_accept_customer_doc',
                'legal_acceptances',
                ['customer_id', 'document_id'],
                unique=False
            )
    
    print("✅ Pre-flight optimization migration complete:")
    print("   - Checked/Created performance indices for Order table")
    print("   - Checked/Created performance indices for InventoryTransaction table")
    print("   - Checked/Created indices for Customer table (if exists)")
    print("   - Checked/Created legal_documents table and indices")
    print("   - Checked/Created legal_acceptances table and indices")


def downgrade() -> None:
    """
    Rollback pre-flight optimizations.
    """
    # Idempotent downgrade
    
    # Drop legal tables
    if table_exists('legal_acceptances'):
        if index_exists('legal_acceptances', 'idx_legal_accept_customer_doc'):
            op.drop_index('idx_legal_accept_customer_doc', table_name='legal_acceptances')
        if index_exists('legal_acceptances', 'idx_legal_accept_user_doc'):
            op.drop_index('idx_legal_accept_user_doc', table_name='legal_acceptances')
        op.drop_table('legal_acceptances')
    
    if table_exists('legal_documents'):
        if index_exists('legal_documents', 'idx_legal_doc_type_current'):
            op.drop_index('idx_legal_doc_type_current', table_name='legal_documents')
        op.drop_table('legal_documents')
    
    # Drop customer indices
    if table_exists('customers'):
        if index_exists('customers', 'idx_customer_tenant_name'):
            op.drop_index('idx_customer_tenant_name', table_name='customers')
        if index_exists('customers', 'idx_customer_tenant_phone'):
            op.drop_index('idx_customer_tenant_phone', table_name='customers')
        if index_exists('customers', 'idx_customer_tenant_email'):
            op.drop_index('idx_customer_tenant_email', table_name='customers')
    
    # Drop inventory transaction indices
    if table_exists('inventory_transactions'):
        if index_exists('inventory_transactions', 'idx_inv_ingredient_type'):
            op.drop_index('idx_inv_ingredient_type', table_name='inventory_transactions')
        if index_exists('inventory_transactions', 'idx_inv_tenant_date'):
            op.drop_index('idx_inv_tenant_date', table_name='inventory_transactions')
        if index_exists('inventory_transactions', 'idx_inv_tenant_ingredient'):
            op.drop_index('idx_inv_tenant_ingredient', table_name='inventory_transactions')
    
    # Drop order indices
    if table_exists('orders'):
        if index_exists('orders', 'idx_order_table_status'):
            op.drop_index('idx_order_table_status', table_name='orders')
        if index_exists('orders', 'idx_order_tenant_status'):
            op.drop_index('idx_order_tenant_status', table_name='orders')
        if index_exists('orders', 'idx_order_tenant_date'):
            op.drop_index('idx_order_tenant_date', table_name='orders')
    
    print("✅ Pre-flight optimization migration rolled back")


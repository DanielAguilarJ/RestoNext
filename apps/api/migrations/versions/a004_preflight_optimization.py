"""
RestoNext MX - Database Performance & Legal Compliance Migration
================================================================
Alembic revision: a004_preflight_optimization

Revision ID: a004_preflight_optimization
Revises: add_self_service_dining
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
down_revision = 'add_self_service_dining'
branch_labels = None
depends_on = None


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
    op.create_index(
        'idx_order_tenant_date',
        'orders',
        ['tenant_id', 'created_at'],
        unique=False
    )
    
    op.create_index(
        'idx_order_tenant_status',
        'orders',
        ['tenant_id', 'status'],
        unique=False
    )
    
    op.create_index(
        'idx_order_table_status',
        'orders',
        ['table_id', 'status'],
        unique=False
    )
    
    # InventoryTransaction indices - Critical for Stock queries
    op.create_index(
        'idx_inv_tenant_ingredient',
        'inventory_transactions',
        ['tenant_id', 'ingredient_id'],
        unique=False
    )
    
    op.create_index(
        'idx_inv_tenant_date',
        'inventory_transactions',
        ['tenant_id', 'created_at'],
        unique=False
    )
    
    op.create_index(
        'idx_inv_ingredient_type',
        'inventory_transactions',
        ['ingredient_id', 'transaction_type'],
        unique=False
    )
    
    # Customer table indices - CRM lookups
    op.create_index(
        'idx_customer_tenant_email',
        'customers',
        ['tenant_id', 'email'],
        unique=False
    )
    
    op.create_index(
        'idx_customer_tenant_phone',
        'customers',
        ['tenant_id', 'phone'],
        unique=False
    )
    
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
    
    op.create_index(
        'idx_legal_doc_type_current',
        'legal_documents',
        ['type', 'is_current'],
        unique=False
    )
    
    # Create legal_acceptances table
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
    
    op.create_index(
        'idx_legal_accept_user_doc',
        'legal_acceptances',
        ['user_id', 'document_id'],
        unique=False
    )
    
    op.create_index(
        'idx_legal_accept_customer_doc',
        'legal_acceptances',
        ['customer_id', 'document_id'],
        unique=False
    )
    
    print("✅ Pre-flight optimization migration complete:")
    print("   - 6 performance indices created for Order table")
    print("   - 3 performance indices created for InventoryTransaction table")
    print("   - 3 performance indices created for Customer table")
    print("   - legal_documents table created")
    print("   - legal_acceptances table created")


def downgrade() -> None:
    """
    Rollback pre-flight optimizations.
    """
    
    # Drop legal tables
    op.drop_index('idx_legal_accept_customer_doc', table_name='legal_acceptances')
    op.drop_index('idx_legal_accept_user_doc', table_name='legal_acceptances')
    op.drop_table('legal_acceptances')
    
    op.drop_index('idx_legal_doc_type_current', table_name='legal_documents')
    op.drop_table('legal_documents')
    
    # Drop customer indices
    op.drop_index('idx_customer_tenant_name', table_name='customers')
    op.drop_index('idx_customer_tenant_phone', table_name='customers')
    op.drop_index('idx_customer_tenant_email', table_name='customers')
    
    # Drop inventory transaction indices
    op.drop_index('idx_inv_ingredient_type', table_name='inventory_transactions')
    op.drop_index('idx_inv_tenant_date', table_name='inventory_transactions')
    op.drop_index('idx_inv_tenant_ingredient', table_name='inventory_transactions')
    
    # Drop order indices
    op.drop_index('idx_order_table_status', table_name='orders')
    op.drop_index('idx_order_tenant_status', table_name='orders')
    op.drop_index('idx_order_tenant_date', table_name='orders')
    
    print("✅ Pre-flight optimization migration rolled back")

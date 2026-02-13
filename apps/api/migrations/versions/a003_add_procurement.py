"""Add Smart Procurement models

Revision ID: a003_add_procurement
Revises: 47d90cf2bfff
Create Date: 2026-01-09

Adds tables for Smart Procurement module:
- suppliers: Supplier/vendor information
- supplier_ingredients: Many-to-many with cost per unit
- purchase_orders: Purchase order header
- purchase_order_items: Purchase order line items
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = 'a003_add_procurement'
down_revision = '47d90cf2bfff'
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    """Check if a table exists"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"""
        SELECT 1 FROM information_schema.tables WHERE table_name = '{table_name}'
    """))
    return result.fetchone() is not None


def enum_exists(enum_name: str) -> bool:
    """Check if an enum type exists"""
    conn = op.get_bind()
    result = conn.execute(sa.text(f"""
        SELECT 1 FROM pg_type WHERE typname = '{enum_name}'
    """))
    return result.fetchone() is not None


def ensure_enum(name: str, values: list):
    """Ensure an enum exists, creating it if not"""
    if enum_exists(name):  # Double check
        return

    try:
        enum_type = postgresql.ENUM(*values, name=name)
        enum_type.create(op.get_bind())
    except Exception as e:
        print(f"Warning: Could not create enum {name}, assuming it exists. Error: {e}")


def upgrade() -> None:
    # Ensure purchase_order_status enum
    ensure_enum('purchaseorderstatus', ['draft', 'pending', 'approved', 'received', 'cancelled'])
    
    # Create suppliers table
    if not table_exists('suppliers'):
        op.create_table(
            'suppliers',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(128), nullable=False),
            sa.Column('contact_name', sa.String(128), nullable=True),
            sa.Column('email', sa.String(255), nullable=True),
            sa.Column('phone', sa.String(20), nullable=True),
            sa.Column('address', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_suppliers_tenant'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id', 'name', name='uq_tenant_supplier_name')
        )
        op.create_index('ix_suppliers_tenant_id', 'suppliers', ['tenant_id'])
    
    # Create supplier_ingredients table
    if not table_exists('supplier_ingredients'):
        op.create_table(
            'supplier_ingredients',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('supplier_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('ingredient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('cost_per_unit', sa.Float(), nullable=False),
            sa.Column('lead_days', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('min_order_quantity', sa.Float(), nullable=False, server_default='1'),
            sa.Column('notes', sa.String(255), nullable=True),
            sa.Column('is_preferred', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name='fk_supplier_ingredients_supplier'),
            sa.ForeignKeyConstraint(['ingredient_id'], ['ingredients.id'], name='fk_supplier_ingredients_ingredient'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('supplier_id', 'ingredient_id', name='uq_supplier_ingredient')
        )
        op.create_index('ix_supplier_ingredients_supplier_id', 'supplier_ingredients', ['supplier_id'])
        op.create_index('ix_supplier_ingredients_ingredient_id', 'supplier_ingredients', ['ingredient_id'])
    
    # Create purchase_orders table
    if not table_exists('purchase_orders'):
        op.create_table(
            'purchase_orders',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('supplier_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('status', postgresql.ENUM('draft', 'pending', 'approved', 'received', 'cancelled', name='purchaseorderstatus', create_type=False), nullable=False, server_default='draft'),
            sa.Column('expected_delivery', sa.DateTime(), nullable=True),
            sa.Column('actual_delivery', sa.DateTime(), nullable=True),
            sa.Column('subtotal', sa.Float(), nullable=False, server_default='0'),
            sa.Column('tax', sa.Float(), nullable=False, server_default='0'),
            sa.Column('total', sa.Float(), nullable=False, server_default='0'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('approved_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], name='fk_purchase_orders_tenant'),
            sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], name='fk_purchase_orders_supplier'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_purchase_orders_created_by'),
            sa.ForeignKeyConstraint(['approved_by'], ['users.id'], name='fk_purchase_orders_approved_by'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_purchase_orders_tenant_id', 'purchase_orders', ['tenant_id'])
        op.create_index('ix_purchase_orders_supplier_id', 'purchase_orders', ['supplier_id'])
        op.create_index('ix_purchase_orders_status', 'purchase_orders', ['status'])
    
    # Create purchase_order_items table
    if not table_exists('purchase_order_items'):
        op.create_table(
            'purchase_order_items',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('purchase_order_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('ingredient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('quantity_ordered', sa.Float(), nullable=False),
            sa.Column('quantity_received', sa.Float(), nullable=False, server_default='0'),
            sa.Column('unit_cost', sa.Float(), nullable=False),
            sa.Column('total_cost', sa.Float(), nullable=False),
            sa.Column('notes', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], name='fk_purchase_order_items_order', ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['ingredient_id'], ['ingredients.id'], name='fk_purchase_order_items_ingredient'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_purchase_order_items_order_id', 'purchase_order_items', ['purchase_order_id'])


def downgrade() -> None:
    # Drop tables check if exists
    if table_exists('purchase_order_items'):
        op.drop_table('purchase_order_items')
    if table_exists('purchase_orders'):
        op.drop_table('purchase_orders')
    if table_exists('supplier_ingredients'):
        op.drop_table('supplier_ingredients')
    if table_exists('suppliers'):
        op.drop_table('suppliers')
    
    # Drop the enum
    if enum_exists('purchaseorderstatus'):
        op.execute('DROP TYPE IF EXISTS purchaseorderstatus')


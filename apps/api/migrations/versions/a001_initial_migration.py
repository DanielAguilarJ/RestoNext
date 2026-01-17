"""Initial migration

Revision ID: a001_initial
Revises: 
Create Date: 2026-01-08 21:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a001_initial'
down_revision = None
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
    if not enum_exists(name):
        enum_type = postgresql.ENUM(*values, name=name)
        enum_type.create(op.get_bind())


def upgrade() -> None:
    # --- Ensure Enums Exist ---
    ensure_enum('userrole', ['ADMIN', 'MANAGER', 'WAITER', 'KITCHEN', 'CASHIER'])
    ensure_enum('routedestination', ['KITCHEN', 'BAR'])
    ensure_enum('tablestatus', ['FREE', 'OCCUPIED', 'BILL_REQUESTED'])
    ensure_enum('orderstatus', ['OPEN', 'IN_PROGRESS', 'READY', 'DELIVERED', 'PAID', 'CANCELLED'])
    ensure_enum('orderitemstatus', ['PENDING', 'PREPARING', 'READY', 'SERVED'])
    ensure_enum('splittype', ['BY_SEAT', 'EVEN', 'CUSTOM'])
    ensure_enum('cfdistatus', ['PENDING', 'STAMPED', 'CANCELLED', 'ERROR'])

    # --- Tenants ---
    if not table_exists('tenants'):
        op.create_table(
            'tenants',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=128), nullable=False),
            sa.Column('slug', sa.String(length=64), nullable=False),
            sa.Column('fiscal_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('slug')
        )

    # --- Users ---
    if not table_exists('users'):
        op.create_table(
            'users',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('hashed_password', sa.String(length=255), nullable=False),
            sa.Column('name', sa.String(length=128), nullable=False),
            sa.Column('role', sa.Enum('ADMIN', 'MANAGER', 'WAITER', 'KITCHEN', 'CASHIER', name='userrole', create_type=False), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('email')
        )

    # --- Menu Categories ---
    if not table_exists('menu_categories'):
        op.create_table(
            'menu_categories',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=64), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('sort_order', sa.Integer(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Menu Items ---
    if not table_exists('menu_items'):
        op.create_table(
            'menu_items',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=128), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('price', sa.Float(), nullable=False),
            sa.Column('image_url', sa.String(length=512), nullable=True),
            sa.Column('route_to', sa.Enum('KITCHEN', 'BAR', name='routedestination', create_type=False), nullable=False),
            sa.Column('modifiers_schema', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('is_available', sa.Boolean(), nullable=False),
            sa.Column('sort_order', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['category_id'], ['menu_categories.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Tables ---
    if not table_exists('tables'):
        op.create_table(
            'tables',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('number', sa.Integer(), nullable=False),
            sa.Column('capacity', sa.Integer(), nullable=False),
            sa.Column('status', sa.Enum('FREE', 'OCCUPIED', 'BILL_REQUESTED', name='tablestatus', create_type=False), nullable=False),
            sa.Column('pos_x', sa.Integer(), nullable=False),
            sa.Column('pos_y', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id', 'number', name='uq_tenant_table_number')
        )

    # --- Orders ---
    if not table_exists('orders'):
        op.create_table(
            'orders',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('table_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('waiter_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('status', sa.Enum('OPEN', 'IN_PROGRESS', 'READY', 'DELIVERED', 'PAID', 'CANCELLED', name='orderstatus', create_type=False), nullable=False),
            sa.Column('subtotal', sa.Float(), nullable=False),
            sa.Column('tax', sa.Float(), nullable=False),
            sa.Column('total', sa.Float(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['table_id'], ['tables.id'], ),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.ForeignKeyConstraint(['waiter_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Order Items ---
    if not table_exists('order_items'):
        op.create_table(
            'order_items',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('menu_item_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('menu_item_name', sa.String(length=128), nullable=False),
            sa.Column('route_to', sa.Enum('KITCHEN', 'BAR', name='routedestination', create_type=False), nullable=False),
            sa.Column('quantity', sa.Integer(), nullable=False),
            sa.Column('unit_price', sa.Float(), nullable=False),
            sa.Column('selected_modifiers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('seat_number', sa.Integer(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('status', sa.Enum('PENDING', 'PREPARING', 'READY', 'SERVED', name='orderitemstatus', create_type=False), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['menu_item_id'], ['menu_items.id'], ),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Bill Splits ---
    if not table_exists('bill_splits'):
        op.create_table(
            'bill_splits',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('split_type', sa.Enum('BY_SEAT', 'EVEN', 'CUSTOM', name='splittype', create_type=False), nullable=False),
            sa.Column('splits', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Invoices ---
    if not table_exists('invoices'):
        op.create_table(
            'invoices',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('uuid', sa.String(length=36), nullable=True),
            sa.Column('status', sa.Enum('PENDING', 'STAMPED', 'CANCELLED', 'ERROR', name='cfdistatus', create_type=False), nullable=False),
            sa.Column('receptor_rfc', sa.String(length=13), nullable=False),
            sa.Column('receptor_nombre', sa.String(length=300), nullable=False),
            sa.Column('receptor_cp', sa.String(length=5), nullable=False),
            sa.Column('uso_cfdi', sa.String(length=3), nullable=False),
            sa.Column('subtotal', sa.Float(), nullable=False),
            sa.Column('iva', sa.Float(), nullable=False),
            sa.Column('total', sa.Float(), nullable=False),
            sa.Column('pdf_url', sa.String(length=512), nullable=True),
            sa.Column('xml_url', sa.String(length=512), nullable=True),
            sa.Column('sat_response', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # --- Daily Sales ---
    if not table_exists('daily_sales'):
        op.create_table(
            'daily_sales',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('date', sa.DateTime(), nullable=False),
            sa.Column('ingredient', sa.String(length=64), nullable=False),
            sa.Column('quantity_sold', sa.Float(), nullable=False),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('tenant_id', 'date', 'ingredient', name='uq_daily_sales')
        )


def downgrade() -> None:
    # Not implementing idempotent downgrade logic as usually downgrade is forced
    # But checking existence prevents errors if dropping non-existent tables
    
    if table_exists('daily_sales'):
        op.drop_table('daily_sales')
    if table_exists('invoices'):
        op.drop_table('invoices')
    if table_exists('bill_splits'):
        op.drop_table('bill_splits')
    if table_exists('order_items'):
        op.drop_table('order_items')
    if table_exists('orders'):
        op.drop_table('orders')
    if table_exists('tables'):
        op.drop_table('tables')
    if table_exists('menu_items'):
        op.drop_table('menu_items')
    if table_exists('menu_categories'):
        op.drop_table('menu_categories')
    if table_exists('users'):
        op.drop_table('users')
    if table_exists('tenants'):
        op.drop_table('tenants')
    
    # Drop enums
    for enum_name in ['userrole', 'orderstatus', 'tablestatus', 'orderitemstatus', 'routedestination', 'cfdistatus', 'splittype']:
        if enum_exists(enum_name):
            sa.Enum(name=enum_name).drop(op.get_bind())


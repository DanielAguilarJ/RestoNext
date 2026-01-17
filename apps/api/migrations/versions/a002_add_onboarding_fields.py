"""Add onboarding fields to tenants

Revision ID: a002_onboarding
Revises: a001_initial
Create Date: 2026-01-09 00:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a002_onboarding'
down_revision = 'a001_initial'
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


def upgrade() -> None:
    # Add business identity columns
    if not column_exists('tenants', 'legal_name'):
        op.add_column('tenants', sa.Column('legal_name', sa.String(length=300), nullable=True))
    if not column_exists('tenants', 'trade_name'):
        op.add_column('tenants', sa.Column('trade_name', sa.String(length=200), nullable=True))
    if not column_exists('tenants', 'logo_url'):
        op.add_column('tenants', sa.Column('logo_url', sa.String(length=512), nullable=True))
    
    # Add fiscal data columns for CFDI 4.0
    if not column_exists('tenants', 'rfc'):
        op.add_column('tenants', sa.Column('rfc', sa.String(length=13), nullable=True))
    if not column_exists('tenants', 'regimen_fiscal'):
        op.add_column('tenants', sa.Column('regimen_fiscal', sa.String(length=3), nullable=True))
    if not column_exists('tenants', 'uso_cfdi_default'):
        op.add_column('tenants', sa.Column('uso_cfdi_default', sa.String(length=3), nullable=False, server_default='G03'))
    
    # Add JSONB columns for structured data
    if not column_exists('tenants', 'fiscal_address'):
        op.add_column('tenants', sa.Column('fiscal_address', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    if not column_exists('tenants', 'contacts'):
        op.add_column('tenants', sa.Column('contacts', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    if not column_exists('tenants', 'ticket_config'):
        op.add_column('tenants', sa.Column('ticket_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    if not column_exists('tenants', 'billing_config'):
        op.add_column('tenants', sa.Column('billing_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    
    # Add operational settings
    if not column_exists('tenants', 'timezone'):
        op.add_column('tenants', sa.Column('timezone', sa.String(length=64), nullable=False, server_default='America/Mexico_City'))
    if not column_exists('tenants', 'currency'):
        op.add_column('tenants', sa.Column('currency', sa.String(length=3), nullable=False, server_default='MXN'))
    if not column_exists('tenants', 'locale'):
        op.add_column('tenants', sa.Column('locale', sa.String(length=10), nullable=False, server_default='es-MX'))
    
    # Add onboarding state columns
    if not column_exists('tenants', 'onboarding_complete'):
        op.add_column('tenants', sa.Column('onboarding_complete', sa.Boolean(), nullable=False, server_default='false'))
    if not column_exists('tenants', 'onboarding_step'):
        op.add_column('tenants', sa.Column('onboarding_step', sa.String(length=32), nullable=False, server_default='basic'))


def downgrade() -> None:
    # Drop columns idempotently
    columns = [
        'onboarding_step', 'onboarding_complete',
        'locale', 'currency', 'timezone',
        'billing_config', 'ticket_config', 'contacts', 'fiscal_address',
        'uso_cfdi_default', 'regimen_fiscal', 'rfc',
        'logo_url', 'trade_name', 'legal_name'
    ]
    
    for col in columns:
        if column_exists('tenants', col):
            op.drop_column('tenants', col)


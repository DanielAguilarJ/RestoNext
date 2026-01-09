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


def upgrade() -> None:
    # Add business identity columns
    op.add_column('tenants', sa.Column('legal_name', sa.String(length=300), nullable=True))
    op.add_column('tenants', sa.Column('trade_name', sa.String(length=200), nullable=True))
    op.add_column('tenants', sa.Column('logo_url', sa.String(length=512), nullable=True))
    
    # Add fiscal data columns for CFDI 4.0
    op.add_column('tenants', sa.Column('rfc', sa.String(length=13), nullable=True))
    op.add_column('tenants', sa.Column('regimen_fiscal', sa.String(length=3), nullable=True))
    op.add_column('tenants', sa.Column('uso_cfdi_default', sa.String(length=3), nullable=False, server_default='G03'))
    
    # Add JSONB columns for structured data
    op.add_column('tenants', sa.Column('fiscal_address', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('tenants', sa.Column('contacts', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('tenants', sa.Column('ticket_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    op.add_column('tenants', sa.Column('billing_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'))
    
    # Add operational settings
    op.add_column('tenants', sa.Column('timezone', sa.String(length=64), nullable=False, server_default='America/Mexico_City'))
    op.add_column('tenants', sa.Column('currency', sa.String(length=3), nullable=False, server_default='MXN'))
    op.add_column('tenants', sa.Column('locale', sa.String(length=10), nullable=False, server_default='es-MX'))
    
    # Add onboarding state columns
    op.add_column('tenants', sa.Column('onboarding_complete', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('tenants', sa.Column('onboarding_step', sa.String(length=32), nullable=False, server_default='basic'))


def downgrade() -> None:
    # Drop onboarding state columns
    op.drop_column('tenants', 'onboarding_step')
    op.drop_column('tenants', 'onboarding_complete')
    
    # Drop operational settings
    op.drop_column('tenants', 'locale')
    op.drop_column('tenants', 'currency')
    op.drop_column('tenants', 'timezone')
    
    # Drop JSONB columns
    op.drop_column('tenants', 'billing_config')
    op.drop_column('tenants', 'ticket_config')
    op.drop_column('tenants', 'contacts')
    op.drop_column('tenants', 'fiscal_address')
    
    # Drop fiscal data columns
    op.drop_column('tenants', 'uso_cfdi_default')
    op.drop_column('tenants', 'regimen_fiscal')
    op.drop_column('tenants', 'rfc')
    
    # Drop business identity columns
    op.drop_column('tenants', 'logo_url')
    op.drop_column('tenants', 'trade_name')
    op.drop_column('tenants', 'legal_name')

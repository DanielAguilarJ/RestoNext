"""add pin_hash to users

Revision ID: a005_add_pin_hash
Revises: a004_preflight_optimization (or previous migration)
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a005_add_pin_hash'
down_revision = 'a004_preflight_optimization'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add pin_hash field to users table for fast POS authentication.
    This allows staff to log in with a 4-6 digit PIN instead of email/password.
    """
    op.add_column(
        'users',
        sa.Column('pin_hash', sa.String(255), nullable=True)
    )
    
    # Create an index for faster PIN lookups
    op.create_index(
        'ix_users_pin_hash',
        'users',
        ['pin_hash'],
        unique=False  # PINs may not be unique across tenants
    )


def downgrade() -> None:
    """Remove pin_hash field from users table."""
    op.drop_index('ix_users_pin_hash', table_name='users')
    op.drop_column('users', 'pin_hash')

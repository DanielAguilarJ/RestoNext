"""add pin_hash to users

Revision ID: a005_add_pin_hash
Revises: a004_preflight_optimization
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a005_add_pin_hash'
down_revision = 'a004_preflight_optimization'
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
    Add pin_hash field to users table for fast POS authentication.
    This allows staff to log in with a 4-6 digit PIN instead of email/password.
    """
    if not column_exists('users', 'pin_hash'):
        op.add_column(
            'users',
            sa.Column('pin_hash', sa.String(255), nullable=True)
        )
    
    # Create an index for faster PIN lookups
    if not index_exists('users', 'ix_users_pin_hash'):
        op.create_index(
            'ix_users_pin_hash',
            'users',
            ['pin_hash'],
            unique=False  # PINs may not be unique across tenants
        )


def downgrade() -> None:
    """Remove pin_hash field from users table."""
    if index_exists('users', 'ix_users_pin_hash'):
        op.drop_index('ix_users_pin_hash', table_name='users')
    
    if column_exists('users', 'pin_hash'):
        op.drop_column('users', 'pin_hash')

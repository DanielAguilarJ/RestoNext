#!/bin/bash
# ==============================================
# RestoNext Production Startup Script
# ==============================================
# This script ensures the database is ready before starting the server.
# It handles the case where tables exist but alembic_version doesn't.

set -e

echo "🚀 RestoNext Production Startup"
echo "================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

echo "✅ DATABASE_URL is configured"

# Function to run SQL commands
run_sql() {
    # Convert asyncpg URL to psql format
    PSQL_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg/postgresql/')
    psql "$PSQL_URL" -c "$1" 2>/dev/null || true
}

# Function to check if a table exists
table_exists() {
    PSQL_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg/postgresql/')
    result=$(psql "$PSQL_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$1');" 2>/dev/null | tr -d '[:space:]')
    [ "$result" = "t" ]
}

# Function to check if a column exists
column_exists() {
    PSQL_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg/postgresql/')
    result=$(psql "$PSQL_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = '$1' AND column_name = '$2');" 2>/dev/null | tr -d '[:space:]')
    [ "$result" = "t" ]
}

echo ""
echo "📊 Checking database state..."

# Check if alembic_version table exists
if table_exists "alembic_version"; then
    echo "✅ alembic_version table exists"
    
    # Check current version
    PSQL_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg/postgresql/')
    current_version=$(psql "$PSQL_URL" -t -c "SELECT version_num FROM alembic_version LIMIT 1;" 2>/dev/null | tr -d '[:space:]')
    
    if [ -n "$current_version" ]; then
        echo "   Current version: $current_version"
    else
        echo "   No version stamped yet"
    fi
else
    echo "⚠️  alembic_version table doesn't exist"
    
    # Check if tenants table exists (meaning DB was set up manually)
    if table_exists "tenants"; then
        echo "   But 'tenants' table exists - database was set up outside of migrations"
        echo "   Creating alembic_version and stamping to latest..."
        
        # Create alembic_version table and stamp it
        run_sql "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);"
        run_sql "INSERT INTO alembic_version (version_num) VALUES ('add_self_service_dining') ON CONFLICT DO NOTHING;"
        echo "✅ Database stamped to 'add_self_service_dining'"
    fi
fi

echo ""
echo "🔧 Ensuring all required columns exist..."

# Add missing columns for scheduler jobs to work
# These are idempotent - they won't fail if columns already exist

# orders.customer_id
if ! column_exists "orders" "customer_id"; then
    echo "   Adding orders.customer_id..."
    run_sql "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);"
fi

# orders.service_type  
if ! column_exists "orders" "service_type"; then
    echo "   Adding orders.service_type..."
    run_sql "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'servicetype') THEN CREATE TYPE servicetype AS ENUM ('dine_in', 'delivery', 'take_away', 'drive_thru'); END IF; END \$\$;"
    run_sql "ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_type servicetype DEFAULT 'dine_in';"
fi

# orders.delivery_info
if ! column_exists "orders" "delivery_info"; then
    echo "   Adding orders.delivery_info..."
    run_sql "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_info JSONB DEFAULT '{}'::jsonb;"
fi

# tenants.active_addons
if ! column_exists "tenants" "active_addons"; then
    echo "   Adding tenants.active_addons..."
    run_sql "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_addons JSONB NOT NULL DEFAULT '{\"self_service\": false, \"delivery\": false, \"kds_pro\": false}'::jsonb;"
fi

# tenants.features_config
if ! column_exists "tenants" "features_config"; then
    echo "   Adding tenants.features_config..."
    run_sql "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features_config JSONB NOT NULL DEFAULT '{}'::jsonb;"
fi

# Check if loyalty_transactions table exists before adding columns
if table_exists "loyalty_transactions"; then
    # loyalty_transactions.expires_at
    if ! column_exists "loyalty_transactions" "expires_at"; then
        echo "   Adding loyalty_transactions.expires_at..."
        run_sql "ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;"
    fi

    # loyalty_transactions.processed_for_expiry
    if ! column_exists "loyalty_transactions" "processed_for_expiry"; then
        echo "   Adding loyalty_transactions.processed_for_expiry..."
        run_sql "ALTER TABLE loyalty_transactions ADD COLUMN IF NOT EXISTS processed_for_expiry BOOLEAN DEFAULT FALSE;"
    fi
else
    echo "   ℹ️  loyalty_transactions table doesn't exist yet - skipping those columns"
fi

# users.pin_hash
if ! column_exists "users" "pin_hash"; then
    echo "   Adding users.pin_hash..."
    run_sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);"
fi

echo ""
echo "✅ Database schema is ready!"
echo ""
echo "🌐 Starting uvicorn server..."

# Start the server
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1

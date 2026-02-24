#!/bin/bash
# ==============================================
# RestoNext Production Startup Script
# ==============================================
# This script ensures the database is ready before starting the server.
# It now relies on idempotent Alembic migrations for robustness.

set -e

echo "🚀 RestoNext Production Startup"
echo "================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

echo "✅ DATABASE_URL is configured"

echo "🔄 Running Database Migrations..."
# Apply all migrations using Alembic
# Since migrations are idempotent, this is safe to run on every deploy
# and handles both fresh DBs and existing partial checks.
if alembic upgrade head; then
    echo "✅ Database schema is up to date!"
else
    echo "❌ Migration failed!"
    exit 1
fi

echo ""
echo "🌱 Seeding database with initial data..."
# Run the seed script - it is idempotent (safe to run multiple times)
if python seed_db.py; then
    echo "✅ Database seeding completed successfully"
else
    echo "⚠️  Database seeding failed (non-critical, continuing...)"
fi

echo ""
echo "🌐 Starting uvicorn server..."

# Start the server
# --root-path /api: DigitalOcean strips /api before forwarding; this ensures
# FastAPI constructs correct redirect URLs (e.g. trailing slash redirects)
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --root-path /api

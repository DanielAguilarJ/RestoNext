# Implementation Plan - Idempotent Migrations

## Goal Description
The current deployment is failing with `DuplicateTableError` because the database contains tables (e.g., `tenants`) but lacks the `alembic_version` table. The `start.sh` script designed to handle this is being bypassed by the Railway "Custom Start Command". 

To resolve this robustly and ensure the database is brought to the correct state regardless of its starting point, we will make **all** migration scripts idempotent. This means they will check for the existence of tables, columns, and types before attempting to create them.

## User Review Required
> [!IMPORTANT]
> **Railway Configuration**: Please ensure the "Start Command" in Railway is either cleared (to use the Dockerfile default) or explicitly set to `/app/start.sh`. While these code changes make the deployment robust even if `alembic upgrade head` is run directly, checking the start command is best practice.

## Proposed Changes

We will modify the following migration files to include `IF NOT EXISTS` checks (using helper functions like `table_exists`, `column_exists`, `enum_exists`):

### Migrations

#### [MODIFY] [a001_initial_migration.py](apps/api/migrations/versions/a001_initial_migration.py)
- Wrap all `op.create_table` calls with a check for table existence.
- Wrap `create_type` for enums with `IF NOT EXISTS` checks.

#### [MODIFY] [a002_add_onboarding_fields.py](apps/api/migrations/versions/a002_add_onboarding_fields.py)
- Check if `onboarding_completed` and `first_login` columns exist in `tenants` before adding.

#### [MODIFY] [323aa6794729_add_inventory_module.py](apps/api/migrations/versions/323aa6794729_add_inventory_module.py)
- Check for existence of inventory-related tables (`suppliers`, `inventory_items`, `recipes`, etc.) before creation.

#### [MODIFY] [a003_add_procurement.py](apps/api/migrations/versions/a003_add_procurement.py)
- Check for existence of procurement tables (`purchase_orders`, `purchase_items`, etc.).

#### [MODIFY] [a004_preflight_optimization.py](apps/api/migrations/versions/a004_preflight_optimization.py)
- Check for existence of `performance_metrics` table and specific indexes.

#### [MODIFY] [a005_add_pin_hash.py](apps/api/migrations/versions/a005_add_pin_hash.py)
- Check if `pin_hash` column exists in `users` before adding.

#### [MODIFY] [add_self_service_dining.py](apps/api/migrations/versions/add_self_service_dining.py)
- Check for existence of self-service columns and enums.

*(Note: `a006_fix_missing_columns.py` is already idempotent)*

## Verification Plan

### Automated Tests
1.  **Local Migration Test**:
    - Ideally, we would simulate the "Partial DB" state locally, but simpler is to verify the migrations generate valid SQL.
    - Run `alembic upgrade head` on a local DB.
    - Run `alembic upgrade head` **again** on the SAME DB. 
        - If idempotent, the second run should succeed (doing nothing) or at least not crash.

### Manual Verification
1.  **Deploy to Railway**:
    - Push changes.
    - Monitor logs.
    - Confirm `alembic` runs without `DuplicateTableError`.
    - Check that missing columns (e.g. `orders.customer_id`) are present in the DB using the Railway CLI or logs.

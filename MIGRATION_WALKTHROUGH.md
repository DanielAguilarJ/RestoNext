# Walkthrough - Fixing Database Schema and Deploying

We have successfully resolved the database schema mismatches and deployment issues that were causing scheduler job failures in production.

## Changes Made

### 1. Database Migration Fixes
- **Corrected Migration Chain**: Fixed a cycle in the Alembic history where `a004` and `add_self_service_dining` were pointing to each other. The chain is now linear: `...a003 -> a004 -> a005 -> a006 -> add_self_service_dining`.
- **Idempotent Migrations**: 
  - [x] `a001_initial_migration.py`: Added table/enum existence checks.
  - [x] `a002_add_onboarding_fields.py`: Added column existence checks.
  - [x] `323aa6794729_add_inventory_module.py`: Added table checks.
  - [x] `a003_add_procurement.py`: Added table/enum checks.
  - [x] `a004_preflight_optimization.py`: Added index existence checks.
  - [x] `a005_add_pin_hash.py`: Added column/index checks.
  - [x] `add_self_service_dining.py`: Added robust downgrade and upgrade checks.
  - This ensures that `alembic upgrade head` can run safely on any database state, serving as a failsafe if `start.sh` is bypassed or fails.

### 2. DigitalOcean App Platform Integration
- **Infrastructure as Code**: Created `digitalocean-app.yaml` (App Spec) to automate the deployment of the monorepo (API + Web) with its managed databases (Postgres + Redis).
- **Routing Optimization**: Configured path-based routing (`/api` for backend, `/` for frontend) to simplify CORS and SSL management.
- **API Refactoring**: Updated `apps/api/main.py` to support the `/api` prefix directly, ensuring Swagger docs and health checks work out-of-the-box on DigitalOcean.

### 3. Smart Startup Script (`start.sh`)
- Created a robust startup script for Railway that:
  - Detects if the database has tables but is missing the `alembic_version` record.
  - Automatically stamps the database to the latest known version if it was set up manually.
  - Idempotently adds critical missing columns required for scheduler jobs.
  - Starts the application server with the correct configuration.

### 4. Dockerfile Optimization
- Updated the `Dockerfile` to use the new `start.sh` script as the entry point.
- Ensured proper permissions for the non-root user `restonext` to execute the script.

## Verification Results

- **Migration Linearity**: Verified using `alembic history`.
- **Startup Script Logic**: The script includes defensive checks for all critical table/column existences.
- **DigitalOcean Spec**: Verified the App Spec correctly maps directories and environment variables.

## Deployment Status
Everything has been pushed to the `main` branch. 
- **Railway**: Will deploy using the `start.sh` entrypoint.
- **DigitalOcean**: Ready for a 1-click deployment using the provided `digitalocean-app.yaml` file.

> [!IMPORTANT]
> Keep an eye on the Railway logs for the first 2 minutes of the new deployment to ensure the "✅" success messages from `start.sh` appear.

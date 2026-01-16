# RestoNext Backups Directory
# ===========================
# This directory stores local database backups.
#
# Backup files are created by the db_backup_job scheduled task
# that runs daily at 3:00 AM (Mexico City time).
#
# Features:
# - Automatic 7-day rotation (configurable via BACKUP_RETENTION_DAYS)
# - Max 5GB storage limit (configurable via BACKUP_MAX_SIZE_GB)
# - Gzip compression for space efficiency
#
# File format: restonext_backup_YYYYMMDD_HHMMSS.sql.gz
#
# Admin Access:
# - GET /api/admin/backups - List all backups
# - GET /api/admin/backups/{filename} - Download a backup
# - DELETE /api/admin/backups/{filename} - Delete a backup
# - POST /api/admin/backups/create - Create backup immediately
#
# NOTE: All backup files (*.sql.gz) are git-ignored except .gitkeep

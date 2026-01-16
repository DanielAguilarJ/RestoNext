"""
RestoNext MX - Admin API Router
================================
Administrative endpoints for super admin operations.

Features:
- Database backup downloads (protected, Super Admin only)
- System status endpoints
- Backup management

Author: RestoNext Team
"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from app.core.auth import get_current_user, require_roles
from app.core.scheduler import list_backups, get_backup_path, run_job_manually
from app.models.models import User, UserRole


router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================
# Response Models
# ============================================

class BackupInfo(BaseModel):
    """Backup file information."""
    filename: str
    size: str
    size_bytes: int
    created: str


class BackupListResponse(BaseModel):
    """List of available backups."""
    total: int
    backups: list[BackupInfo]


class JobRunResponse(BaseModel):
    """Response from running a scheduled job."""
    status: str
    message: str


# ============================================
# Backup Management Endpoints
# ============================================

@router.get(
    "/backups",
    response_model=BackupListResponse,
    summary="List Database Backups",
    description="List all available database backup files. Requires Super Admin role."
)
async def get_backups(
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    List all available database backups.
    
    Returns:
        List of backup files with size and creation time
    """
    backups = list_backups()
    
    return {
        "total": len(backups),
        "backups": backups
    }


@router.get(
    "/backups/{filename}",
    summary="Download Backup File",
    description="Download a specific backup file. Requires Super Admin role."
)
async def download_backup(
    filename: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Download a specific backup file.
    
    Args:
        filename: Name of the backup file (e.g., restonext_backup_20260116_030000.sql.gz)
        
    Returns:
        Streaming file download
        
    Raises:
        404: If backup file not found
        400: If filename is invalid
    """
    # Validate filename format
    if not filename.endswith(".sql.gz"):
        raise HTTPException(
            status_code=400,
            detail="Invalid backup filename format. Must end with .sql.gz"
        )
    
    # Get backup path (with security checks)
    backup_path = get_backup_path(filename)
    
    if backup_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Backup file not found: {filename}"
        )
    
    # Return file for download
    return FileResponse(
        path=backup_path,
        filename=filename,
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.delete(
    "/backups/{filename}",
    summary="Delete Backup File",
    description="Delete a specific backup file. Requires Super Admin role."
)
async def delete_backup(
    filename: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Delete a specific backup file.
    
    Args:
        filename: Name of the backup file to delete
        
    Returns:
        Success message
        
    Raises:
        404: If backup file not found
    """
    backup_path = get_backup_path(filename)
    
    if backup_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Backup file not found: {filename}"
        )
    
    try:
        backup_path.unlink()
        return {"message": f"Backup deleted: {filename}"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete backup: {str(e)}"
        )


@router.post(
    "/backups/create",
    response_model=JobRunResponse,
    summary="Create Backup Now",
    description="Trigger an immediate database backup. Requires Super Admin role."
)
async def create_backup_now(
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Trigger an immediate database backup.
    
    This runs the db_backup_job immediately instead of waiting
    for the scheduled time (3:00 AM).
    
    Returns:
        Job execution result
    """
    result = await run_job_manually("db_backup")
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=500,
            detail=result["message"]
        )
    
    return result


# ============================================
# Scheduled Jobs Management
# ============================================

@router.post(
    "/jobs/{job_name}/run",
    response_model=JobRunResponse,
    summary="Run Scheduled Job",
    description="Manually trigger a scheduled job. Requires Super Admin role."
)
async def run_job(
    job_name: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Manually trigger a scheduled job.
    
    Available jobs:
    - daily_close: Close stale orders
    - inventory_snapshot: Create inventory snapshot
    - expire_points: Process expired loyalty points
    - db_backup: Create database backup
    
    Args:
        job_name: Name of the job to run
        
    Returns:
        Job execution result
    """
    result = await run_job_manually(job_name)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=400,
            detail=result["message"]
        )
    
    return result

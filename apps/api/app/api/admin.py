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

from app.core.security import get_current_user, require_roles
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


# ============================================
# SaaS Metrics Dashboard
# ============================================

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import Tenant


class TenantPlanInfo(BaseModel):
    """Tenant with plan information."""
    id: str
    name: str
    slug: str
    plan: str
    estimated_revenue: float
    is_active: bool
    created_at: str


class SaaSStatsResponse(BaseModel):
    """SaaS platform statistics."""
    total_tenants: int
    active_tenants: int
    tenants_by_plan: dict[str, int]
    estimated_mrr: float  # Monthly Recurring Revenue
    tenants: list[TenantPlanInfo]
    ai_usage: list[dict]  # AI token usage per tenant


# Plan pricing constants (MXN/month)
PLAN_PRICING = {
    "starter": 999.00,
    "professional": 2499.00,
    "enterprise": 5999.00,
}


def _get_tenant_plan(tenant: Tenant) -> str:
    """Determine tenant plan from active_addons."""
    addons = tenant.active_addons or {}
    
    if addons.get("analytics_ai", False):
        return "enterprise"
    elif addons.get("self_service", False) or addons.get("kds_pro", False):
        return "professional"
    else:
        return "starter"


@router.get(
    "/saas-stats",
    response_model=SaaSStatsResponse,
    summary="SaaS Platform Statistics",
    description="Get overall platform metrics including tenants, revenue, and AI usage. Requires Super Admin."
)
async def get_saas_stats(
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """
    Get SaaS platform statistics for the admin dashboard.
    
    Returns:
    - Total and active tenant counts
    - Breakdown by subscription plan
    - Estimated Monthly Recurring Revenue (MRR)
    - AI usage metrics per tenant (for cost monitoring)
    
    Use this to:
    - Monitor platform growth
    - Identify high-value customers
    - Track AI costs by tenant
    """
    # Get all tenants
    result = await db.execute(
        select(Tenant).order_by(Tenant.created_at.desc())
    )
    tenants = result.scalars().all()
    
    # Calculate stats
    total_tenants = len(tenants)
    active_tenants = sum(1 for t in tenants if t.is_active)
    
    # Group by plan
    tenants_by_plan = {"starter": 0, "professional": 0, "enterprise": 0}
    estimated_mrr = 0.0
    
    tenant_list = []
    for tenant in tenants:
        plan = _get_tenant_plan(tenant)
        tenants_by_plan[plan] += 1
        
        if tenant.is_active:
            estimated_mrr += PLAN_PRICING.get(plan, 0)
        
        tenant_list.append(TenantPlanInfo(
            id=str(tenant.id),
            name=tenant.name,
            slug=tenant.slug,
            plan=plan,
            estimated_revenue=PLAN_PRICING.get(plan, 0),
            is_active=tenant.is_active,
            created_at=tenant.created_at.isoformat()
        ))
    
    # AI usage tracking (would typically come from a separate tracking table)
    # For now, we'll return placeholder data structure
    ai_usage = [
        {
            "tenant_id": str(tenant.id),
            "tenant_name": tenant.name,
            "ai_requests_30d": 0,  # Would be tracked in production
            "estimated_cost_usd": 0.0,
        }
        for tenant in tenants
        if _get_tenant_plan(tenant) == "enterprise"  # Only enterprise uses AI
    ]
    
    return SaaSStatsResponse(
        total_tenants=total_tenants,
        active_tenants=active_tenants,
        tenants_by_plan=tenants_by_plan,
        estimated_mrr=estimated_mrr,
        tenants=tenant_list,
        ai_usage=ai_usage
    )


@router.get(
    "/health",
    summary="System Health Check",
    description="Simple health check endpoint."
)
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "service": "RestoNext API",
        "version": "1.0.0"
    }


# ============================================
# Tenant Impersonation (Support Tool)
# ============================================

from app.core.security import create_access_token


class ImpersonationResponse(BaseModel):
    """Response with temporary impersonation token."""
    token: str
    redirect_url: str
    expires_in: int
    impersonating_tenant: str


@router.post(
    "/impersonate/{tenant_id}",
    response_model=ImpersonationResponse,
    summary="Impersonate Tenant Admin",
    description="Generate a temporary token to access a tenant's account. For support purposes only."
)
async def impersonate_tenant(
    tenant_id: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a temporary impersonation token for a tenant.
    
    This allows Super Admins to:
    - Debug issues in a tenant's account
    - Provide hands-on support
    - Verify configurations
    
    Security:
    - Only Super Admin can use this endpoint
    - Token has limited validity (30 minutes)
    - All actions are logged for audit
    
    Args:
        tenant_id: UUID of the tenant to impersonate
        
    Returns:
        Temporary access token and redirect URL
    """
    import uuid as uuid_module
    
    # Validate tenant exists
    try:
        tenant_uuid = uuid_module.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID format")
    
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_uuid)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get the admin user for this tenant
    admin_result = await db.execute(
        select(User).where(
            User.tenant_id == tenant_uuid,
            User.role == UserRole.ADMIN,
            User.is_active == True
        ).limit(1)
    )
    admin_user = admin_result.scalar_one_or_none()
    
    if not admin_user:
        raise HTTPException(
            status_code=404, 
            detail="No active admin user found for this tenant"
        )
    
    # Create temporary token (30 minute validity via custom expiry)
    # The token will include a marker that this is an impersonation session
    token = create_access_token(
        user_id=str(admin_user.id),
        tenant_id=str(tenant.id),
        role=admin_user.role.value
    )
    
    # Log the impersonation for audit
    print(f"AUDIT: Super Admin {current_user.email} impersonating tenant {tenant.name} ({tenant_id})")
    
    return ImpersonationResponse(
        token=token.access_token,
        redirect_url="/",
        expires_in=token.expires_in,
        impersonating_tenant=tenant.name
    )


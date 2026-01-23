"""
RestoNext MX - Activity Logging API Endpoints
==============================================

Receives activity logs from the frontend and processes them.
Provides endpoints for client-side logging integration.

Endpoints:
- POST /api/logs/activity - Receive batch of activity events
- POST /api/logs/error - Receive error events from frontend
"""

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.core.activity_logger import activity_logger
from app.core.logging_config import set_log_context

router = APIRouter(prefix="/logs", tags=["Logging"])


# ============================================
# Request Models
# ============================================

class ActivityEvent(BaseModel):
    """Single activity event from the frontend."""
    type: str = Field(..., description="Event type: page_view, action, click, navigation, etc.")
    timestamp: str = Field(..., description="ISO timestamp when the event occurred")
    page: Optional[str] = Field(None, description="Current page/route")
    component: Optional[str] = Field(None, description="Component that triggered the event")
    action: Optional[str] = Field(None, description="Action name for action events")
    element: Optional[str] = Field(None, description="Element identifier for click events")
    from_page: Optional[str] = Field(None, description="Source page for navigation")
    to_page: Optional[str] = Field(None, description="Destination page for navigation")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional event data")
    session_id: Optional[str] = Field(None, description="Client session ID")


class ActivityBatch(BaseModel):
    """Batch of activity events from the frontend."""
    events: List[ActivityEvent] = Field(..., description="List of activity events")
    user_id: Optional[str] = Field(None, description="Authenticated user ID")
    tenant_id: Optional[str] = Field(None, description="Tenant ID")
    session_id: Optional[str] = Field(None, description="Client session ID")
    client_timestamp: str = Field(..., description="Client timestamp when batch was sent")
    user_agent: Optional[str] = Field(None, description="Browser user agent")


class ErrorEvent(BaseModel):
    """Error event from the frontend."""
    error_type: str = Field(..., description="Error type/name")
    message: str = Field(..., description="Error message")
    stack_trace: Optional[str] = Field(None, description="Error stack trace")
    component: Optional[str] = Field(None, description="Component where error occurred")
    page: Optional[str] = Field(None, description="Page where error occurred")
    timestamp: str = Field(..., description="ISO timestamp when the error occurred")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")
    user_id: Optional[str] = Field(None, description="User ID if authenticated")
    tenant_id: Optional[str] = Field(None, description="Tenant ID")
    session_id: Optional[str] = Field(None, description="Client session ID")


class LogResponse(BaseModel):
    """Standard response for log endpoints."""
    success: bool
    processed: int
    message: str


# ============================================
# Endpoints
# ============================================

@router.post("/activity", response_model=LogResponse)
async def receive_activity_batch(
    batch: ActivityBatch,
    request: Request
) -> LogResponse:
    """
    Receive a batch of activity events from the frontend.
    
    This endpoint accepts batched events from the frontend logger
    and processes them through the activity logging system.
    
    The frontend should batch events and send them periodically
    (e.g., every 5-10 seconds) to reduce request overhead.
    """
    # Set logging context
    set_log_context(
        user_id=batch.user_id,
        tenant_id=batch.tenant_id
    )
    
    processed_count = 0
    
    for event in batch.events:
        try:
            _process_activity_event(event, batch)
            processed_count += 1
        except Exception as e:
            # Log the error but continue processing other events
            logging.getLogger(__name__).warning(
                f"Failed to process activity event: {e}"
            )
    
    return LogResponse(
        success=True,
        processed=processed_count,
        message=f"Processed {processed_count}/{len(batch.events)} events"
    )


@router.post("/error", response_model=LogResponse)
async def receive_error_event(
    error: ErrorEvent,
    request: Request
) -> LogResponse:
    """
    Receive an error event from the frontend.
    
    This endpoint is for immediate error reporting.
    Errors should be sent immediately, not batched.
    """
    # Set logging context
    set_log_context(
        user_id=error.user_id,
        tenant_id=error.tenant_id
    )
    
    # Log the error
    activity_logger.error(
        error_type=error.error_type,
        message=error.message,
        component=error.component,
        stack_trace=error.stack_trace,
        metadata={
            "page": error.page,
            "session_id": error.session_id,
            "client_timestamp": error.timestamp,
            **(error.metadata or {})
        }
    )
    
    return LogResponse(
        success=True,
        processed=1,
        message="Error logged successfully"
    )


@router.get("/health")
async def logs_health():
    """Health check for logging endpoints."""
    return {"status": "ok", "service": "logging"}


# ============================================
# Internal Processing
# ============================================

def _process_activity_event(event: ActivityEvent, batch: ActivityBatch) -> None:
    """Process a single activity event based on its type."""
    
    event_type = event.type.lower()
    
    if event_type == "page_view":
        activity_logger.page_view(
            page=event.page or "unknown",
            user_id=batch.user_id,
            tenant_id=batch.tenant_id,
            metadata={
                "session_id": batch.session_id or event.session_id,
                "client_timestamp": event.timestamp,
                **(event.metadata or {})
            }
        )
    
    elif event_type == "navigation":
        activity_logger.navigation(
            from_page=event.from_page or "unknown",
            to_page=event.to_page or event.page or "unknown",
            navigation_type=event.metadata.get("type", "push") if event.metadata else "push",
            metadata={
                "session_id": batch.session_id or event.session_id,
                "client_timestamp": event.timestamp,
            }
        )
    
    elif event_type == "action":
        activity_logger.action(
            action_name=event.action or "unknown",
            component=event.component or "unknown",
            data={
                "page": event.page,
                "session_id": batch.session_id or event.session_id,
                "client_timestamp": event.timestamp,
                **(event.metadata or {})
            }
        )
    
    elif event_type == "click":
        activity_logger.click(
            element=event.element or "unknown",
            component=event.component or event.page or "unknown",
            metadata={
                "page": event.page,
                "session_id": batch.session_id or event.session_id,
                "client_timestamp": event.timestamp,
                **(event.metadata or {})
            }
        )
    
    elif event_type == "form_submit":
        activity_logger.form_submit(
            form_name=event.component or "unknown",
            success=event.metadata.get("success", True) if event.metadata else True,
            validation_errors=event.metadata.get("errors") if event.metadata else None,
            metadata={
                "page": event.page,
                "session_id": batch.session_id or event.session_id,
                "client_timestamp": event.timestamp,
            }
        )
    
    elif event_type == "api_call":
        if event.metadata:
            activity_logger.api_request(
                method=event.metadata.get("method", "GET"),
                path=event.metadata.get("path", "unknown"),
                status_code=event.metadata.get("status", 0),
                duration_ms=event.metadata.get("duration_ms", 0),
                error=event.metadata.get("error")
            )
    
    elif event_type == "websocket":
        activity_logger.websocket_event(
            event_type=event.action or "unknown",
            channel=event.component or "unknown",
            metadata={
                "page": event.page,
                "session_id": batch.session_id or event.session_id,
                **(event.metadata or {})
            }
        )
    
    elif event_type == "error":
        activity_logger.error(
            error_type=event.metadata.get("error_type", "ClientError") if event.metadata else "ClientError",
            message=event.metadata.get("message", "Unknown error") if event.metadata else "Unknown error",
            component=event.component,
            stack_trace=event.metadata.get("stack_trace") if event.metadata else None,
            metadata={
                "page": event.page,
                "session_id": batch.session_id or event.session_id,
            }
        )
    
    else:
        # Generic event logging
        activity_logger.system_event(
            event_name=event_type,
            message=f"{event.action or event.element or 'event'} on {event.component or event.page or 'unknown'}",
            metadata={
                "page": event.page,
                "component": event.component,
                "action": event.action,
                "session_id": batch.session_id or event.session_id,
                "client_timestamp": event.timestamp,
                **(event.metadata or {})
            }
        )

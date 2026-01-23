"""
RestoNext MX - Structured Activity Logger
==========================================

High-level logging service for tracking user activities, system events,
and application metrics. Provides semantic logging methods for common
operations.

Usage:
    from app.core.activity_logger import activity_logger
    
    # Log a page view
    activity_logger.page_view("/pos", user_id="usr_123", tenant_id="ten_456")
    
    # Log a user action
    activity_logger.action("create_order", "OrderPanel", {"items": 5})
    
    # Log an API request
    activity_logger.api_request("POST", "/api/orders", 201, 145.5)
"""

import logging
import time
from typing import Any, Dict, Optional, Callable
from functools import wraps
from datetime import datetime, timezone

from app.core.logging_config import get_logger, request_id_var, user_id_var, tenant_id_var


class ActivityLogger:
    """
    Structured activity logger for RestoNext SaaS.
    
    Provides semantic logging methods for common operations with
    consistent formatting and context.
    """
    
    def __init__(self, logger_name: str = "restonext.activity"):
        self._logger = get_logger(logger_name)
    
    def _log(
        self,
        level: int,
        log_type: str,
        message: str,
        extra_data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> None:
        """Internal method to log with structured data."""
        record = self._logger.makeRecord(
            name=self._logger.name,
            level=level,
            fn="",
            lno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        record.log_type = log_type
        record.extra_data = extra_data or {}
        record.extra_data.update(kwargs)
        self._logger.handle(record)
    
    # ============================================
    # Page & Navigation Events
    # ============================================
    
    def page_view(
        self,
        page: str,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        referrer: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a page view event."""
        data = {"page": page}
        if referrer:
            data["referrer"] = referrer
        if metadata:
            data.update(metadata)
        
        self._log(
            logging.INFO,
            "PAGE_VIEW",
            f"Page viewed: {page}",
            extra_data=data
        )
    
    def navigation(
        self,
        from_page: str,
        to_page: str,
        navigation_type: str = "push",
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a navigation event."""
        data = {
            "from": from_page,
            "to": to_page,
            "type": navigation_type
        }
        if metadata:
            data.update(metadata)
        
        self._log(
            logging.INFO,
            "NAVIGATION",
            f"Navigation: {from_page} → {to_page}",
            extra_data=data
        )
    
    # ============================================
    # User Actions
    # ============================================
    
    def action(
        self,
        action_name: str,
        component: str,
        data: Optional[Dict[str, Any]] = None,
        success: bool = True
    ) -> None:
        """Log a user action."""
        extra = {
            "action": action_name,
            "component": component,
            "success": success
        }
        if data:
            extra.update(data)
        
        level = logging.INFO if success else logging.WARNING
        self._log(
            level,
            "ACTION",
            f"Action: {action_name} on {component}",
            extra_data=extra
        )
    
    def click(
        self,
        element: str,
        component: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a click event."""
        data = {
            "element": element,
            "component": component
        }
        if metadata:
            data.update(metadata)
        
        self._log(
            logging.DEBUG,
            "CLICK",
            f"Click: {element} in {component}",
            extra_data=data
        )
    
    def form_submit(
        self,
        form_name: str,
        success: bool = True,
        validation_errors: Optional[list] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a form submission."""
        data = {
            "form": form_name,
            "success": success
        }
        if validation_errors:
            data["validation_errors"] = validation_errors
        if metadata:
            data.update(metadata)
        
        level = logging.INFO if success else logging.WARNING
        self._log(
            level,
            "FORM_SUBMIT",
            f"Form submitted: {form_name} ({'success' if success else 'failed'})",
            extra_data=data
        )
    
    # ============================================
    # API & Network Events
    # ============================================
    
    def api_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None,
        error: Optional[str] = None
    ) -> None:
        """Log an API request/response."""
        data = {
            "method": method,
            "path": path,
            "status": status_code,
            "duration_ms": round(duration_ms, 2)
        }
        if request_size:
            data["request_size"] = request_size
        if response_size:
            data["response_size"] = response_size
        if error:
            data["error"] = error
        
        # Determine log level based on status code
        if status_code >= 500:
            level = logging.ERROR
        elif status_code >= 400:
            level = logging.WARNING
        else:
            level = logging.INFO
        
        self._log(
            level,
            "API_REQUEST",
            f"{method} {path} → {status_code} ({duration_ms:.0f}ms)",
            extra_data=data
        )
    
    def websocket_event(
        self,
        event_type: str,
        channel: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a WebSocket event."""
        data = {
            "event": event_type,
            "channel": channel
        }
        if metadata:
            data.update(metadata)
        
        self._log(
            logging.INFO,
            "WEBSOCKET",
            f"WebSocket {event_type}: {channel}",
            extra_data=data
        )
    
    # ============================================
    # Authentication Events
    # ============================================
    
    def auth_login(
        self,
        user_id: str,
        method: str = "password",
        success: bool = True,
        failure_reason: Optional[str] = None
    ) -> None:
        """Log a login attempt."""
        data = {
            "user_id": user_id,
            "method": method,
            "success": success
        }
        if failure_reason:
            data["failure_reason"] = failure_reason
        
        level = logging.INFO if success else logging.WARNING
        status = "successful" if success else "failed"
        self._log(
            level,
            "AUTH_LOGIN",
            f"Login {status} for user {user_id[:12]}... via {method}",
            extra_data=data
        )
    
    def auth_logout(self, user_id: str) -> None:
        """Log a logout event."""
        self._log(
            logging.INFO,
            "AUTH_LOGOUT",
            f"User logged out: {user_id[:12]}...",
            extra_data={"user_id": user_id}
        )
    
    def auth_token_refresh(self, user_id: str, success: bool = True) -> None:
        """Log a token refresh event."""
        self._log(
            logging.DEBUG if success else logging.WARNING,
            "AUTH_REFRESH",
            f"Token refresh {'successful' if success else 'failed'} for {user_id[:12]}...",
            extra_data={"user_id": user_id, "success": success}
        )
    
    # ============================================
    # Business Events
    # ============================================
    
    def order_created(
        self,
        order_id: str,
        table_number: int,
        items_count: int,
        total: float
    ) -> None:
        """Log order creation."""
        self._log(
            logging.INFO,
            "ORDER_CREATED",
            f"Order {order_id[:8]}... created: table {table_number}, {items_count} items, ${total:.2f}",
            extra_data={
                "order_id": order_id,
                "table_number": table_number,
                "items_count": items_count,
                "total": total
            }
        )
    
    def order_status_change(
        self,
        order_id: str,
        old_status: str,
        new_status: str
    ) -> None:
        """Log order status change."""
        self._log(
            logging.INFO,
            "ORDER_STATUS",
            f"Order {order_id[:8]}... status: {old_status} → {new_status}",
            extra_data={
                "order_id": order_id,
                "old_status": old_status,
                "new_status": new_status
            }
        )
    
    def payment_processed(
        self,
        order_id: str,
        amount: float,
        method: str,
        success: bool = True,
        error: Optional[str] = None
    ) -> None:
        """Log payment processing."""
        data = {
            "order_id": order_id,
            "amount": amount,
            "method": method,
            "success": success
        }
        if error:
            data["error"] = error
        
        level = logging.INFO if success else logging.ERROR
        status = "completed" if success else "failed"
        self._log(
            level,
            "PAYMENT",
            f"Payment {status}: ${amount:.2f} via {method} for order {order_id[:8]}...",
            extra_data=data
        )
    
    # ============================================
    # Error Events
    # ============================================
    
    def error(
        self,
        error_type: str,
        message: str,
        component: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an error event."""
        data = {
            "error_type": error_type,
            "message": message
        }
        if component:
            data["component"] = component
        if stack_trace:
            data["stack_trace"] = stack_trace[:500]  # Truncate long traces
        if metadata:
            data.update(metadata)
        
        self._log(
            logging.ERROR,
            "ERROR",
            f"Error [{error_type}]: {message[:100]}",
            extra_data=data
        )
    
    def warning(
        self,
        warning_type: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a warning event."""
        data = {
            "warning_type": warning_type,
            "message": message
        }
        if metadata:
            data.update(metadata)
        
        self._log(
            logging.WARNING,
            "WARNING",
            f"Warning [{warning_type}]: {message[:100]}",
            extra_data=data
        )
    
    # ============================================
    # System Events
    # ============================================
    
    def system_event(
        self,
        event_name: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a system event."""
        data = {"event": event_name}
        if metadata:
            data.update(metadata)
        
        self._log(
            logging.INFO,
            "SYSTEM",
            f"System: {event_name} - {message}",
            extra_data=data
        )
    
    def startup(self, service_name: str, version: str, environment: str) -> None:
        """Log service startup."""
        self._log(
            logging.INFO,
            "STARTUP",
            f"🚀 {service_name} v{version} starting in {environment}",
            extra_data={
                "service": service_name,
                "version": version,
                "environment": environment
            }
        )
    
    def shutdown(self, service_name: str) -> None:
        """Log service shutdown."""
        self._log(
            logging.INFO,
            "SHUTDOWN",
            f"👋 {service_name} shutting down",
            extra_data={"service": service_name}
        )
    
    # ============================================
    # Metrics & Performance
    # ============================================
    
    def metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "",
        tags: Optional[Dict[str, str]] = None
    ) -> None:
        """Log a metric value."""
        data = {
            "metric": metric_name,
            "value": value,
            "unit": unit
        }
        if tags:
            data["tags"] = tags
        
        self._log(
            logging.DEBUG,
            "METRIC",
            f"Metric {metric_name}: {value}{unit}",
            extra_data=data
        )
    
    def performance(
        self,
        operation: str,
        duration_ms: float,
        success: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log a performance measurement."""
        data = {
            "operation": operation,
            "duration_ms": round(duration_ms, 2),
            "success": success
        }
        if metadata:
            data.update(metadata)
        
        # Warn on slow operations (> 1 second)
        level = logging.INFO if duration_ms < 1000 else logging.WARNING
        self._log(
            level,
            "PERFORMANCE",
            f"Perf: {operation} took {duration_ms:.0f}ms",
            extra_data=data
        )


# Singleton instance for easy import
activity_logger = ActivityLogger()


# ============================================
# Decorator for timing functions
# ============================================

def log_performance(operation_name: Optional[str] = None):
    """
    Decorator to log function performance.
    
    Usage:
        @log_performance("fetch_orders")
        async def get_orders():
            ...
    """
    def decorator(func: Callable):
        op_name = operation_name or func.__name__
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                duration = (time.perf_counter() - start) * 1000
                activity_logger.performance(op_name, duration, success=True)
                return result
            except Exception as e:
                duration = (time.perf_counter() - start) * 1000
                activity_logger.performance(op_name, duration, success=False, metadata={"error": str(e)})
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                duration = (time.perf_counter() - start) * 1000
                activity_logger.performance(op_name, duration, success=True)
                return result
            except Exception as e:
                duration = (time.perf_counter() - start) * 1000
                activity_logger.performance(op_name, duration, success=False, metadata={"error": str(e)})
                raise
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator

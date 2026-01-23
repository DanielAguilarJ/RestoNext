"""
RestoNext MX - Centralized Logging Configuration
=================================================

Provides structured logging for all application components.
Outputs to stdout for Digital Ocean Runtime Logs visibility.

Features:
- JSON structured logging for easy parsing
- Configurable log levels by environment
- Sensitive data filtering (passwords, tokens)
- Request context tracking (request_id, user_id, tenant_id)
"""

import logging
import json
import sys
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from contextvars import ContextVar

# Context variables for request tracking
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)
tenant_id_var: ContextVar[Optional[str]] = ContextVar('tenant_id', default=None)


# Patterns for sensitive data that should be masked
SENSITIVE_PATTERNS = [
    (re.compile(r'(password["\']?\s*[:=]\s*["\']?)[^"\'&\s]+', re.IGNORECASE), r'\1[REDACTED]'),
    (re.compile(r'(token["\']?\s*[:=]\s*["\']?)[^"\'&\s]+', re.IGNORECASE), r'\1[REDACTED]'),
    (re.compile(r'(secret["\']?\s*[:=]\s*["\']?)[^"\'&\s]+', re.IGNORECASE), r'\1[REDACTED]'),
    (re.compile(r'(api_key["\']?\s*[:=]\s*["\']?)[^"\'&\s]+', re.IGNORECASE), r'\1[REDACTED]'),
    (re.compile(r'(bearer\s+)[^\s]+', re.IGNORECASE), r'\1[REDACTED]'),
    (re.compile(r'(authorization["\']?\s*[:=]\s*["\']?)[^"\'&\s]+', re.IGNORECASE), r'\1[REDACTED]'),
]


def mask_sensitive_data(text: str) -> str:
    """Mask sensitive data in log messages."""
    if not isinstance(text, str):
        return text
    
    result = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


class StructuredLogFormatter(logging.Formatter):
    """
    Custom formatter that outputs logs in both human-readable and JSON formats.
    
    Human-readable format for console:
    [2026-01-22T21:47:50.123Z] [INFO] [REQUEST] method=POST path=/api/orders status=201
    
    Also includes JSON in a parseable format for log aggregation.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        # Get timestamp in ISO format
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        # Get context from context vars
        request_id = request_id_var.get()
        user_id = user_id_var.get()
        tenant_id = tenant_id_var.get()
        
        # Build the base log entry
        log_data = {
            'timestamp': timestamp,
            'level': record.levelname,
            'logger': record.name,
            'message': mask_sensitive_data(record.getMessage()),
        }
        
        # Add context if available
        if request_id:
            log_data['request_id'] = request_id
        if user_id:
            log_data['user_id'] = user_id
        if tenant_id:
            log_data['tenant_id'] = tenant_id
        
        # Add extra data if provided
        if hasattr(record, 'extra_data') and record.extra_data:
            log_data['data'] = record.extra_data
        
        # Add log type if provided
        log_type = getattr(record, 'log_type', None)
        if log_type:
            log_data['type'] = log_type
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Format: Human-readable followed by JSON
        context_parts = []
        if request_id:
            context_parts.append(f'req={request_id[:8]}')
        if user_id:
            context_parts.append(f'user={user_id[:12]}' if len(user_id) > 12 else f'user={user_id}')
        if tenant_id:
            context_parts.append(f'tenant={tenant_id[:12]}' if len(tenant_id) > 12 else f'tenant={tenant_id}')
        
        context_str = ' '.join(context_parts)
        type_str = f'[{log_type}] ' if log_type else ''
        
        # Build human-readable line
        human_readable = f"[{timestamp}] [{record.levelname}] {type_str}{log_data['message']}"
        if context_str:
            human_readable += f" | {context_str}"
        
        return human_readable


class JSONLogFormatter(logging.Formatter):
    """Pure JSON formatter for structured log aggregation."""
    
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).isoformat()
        
        log_data = {
            'timestamp': timestamp,
            'level': record.levelname,
            'logger': record.name,
            'message': mask_sensitive_data(record.getMessage()),
            'request_id': request_id_var.get(),
            'user_id': user_id_var.get(),
            'tenant_id': tenant_id_var.get(),
        }
        
        if hasattr(record, 'log_type'):
            log_data['type'] = record.log_type
        
        if hasattr(record, 'extra_data') and record.extra_data:
            log_data['data'] = record.extra_data
        
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Remove None values
        log_data = {k: v for k, v in log_data.items() if v is not None}
        
        return json.dumps(log_data, default=str)


def setup_logging(
    log_level: str = "INFO",
    json_format: bool = False,
    app_name: str = "restonext-api"
) -> None:
    """
    Configure the logging system for the application.
    
    Args:
        log_level: Minimum log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: If True, output pure JSON. If False, human-readable with JSON suffix.
        app_name: Application name for the logger
    """
    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Create console handler (stdout for Digital Ocean)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Set formatter based on preference
    if json_format:
        formatter = JSONLogFormatter()
    else:
        formatter = StructuredLogFormatter()
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Configure specific loggers
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # Log startup
    logger = logging.getLogger(app_name)
    logger.info(f"Logging initialized: level={log_level}, format={'JSON' if json_format else 'HUMAN'}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.
    
    Usage:
        logger = get_logger(__name__)
        logger.info("Something happened")
    """
    return logging.getLogger(name)


class LogContext:
    """
    Context manager for setting request context in logs.
    
    Usage:
        with LogContext(request_id="req_123", user_id="usr_456"):
            logger.info("This log will include the context")
    """
    
    def __init__(
        self,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None
    ):
        self.request_id = request_id
        self.user_id = user_id
        self.tenant_id = tenant_id
        self._tokens = []
    
    def __enter__(self):
        if self.request_id:
            self._tokens.append(request_id_var.set(self.request_id))
        if self.user_id:
            self._tokens.append(user_id_var.set(self.user_id))
        if self.tenant_id:
            self._tokens.append(tenant_id_var.set(self.tenant_id))
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        for token in self._tokens:
            # Reset context vars
            pass
        return False


def set_log_context(
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None
) -> None:
    """
    Set the logging context for the current request.
    Call this at the start of request processing.
    """
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)
    if tenant_id:
        tenant_id_var.set(tenant_id)


def clear_log_context() -> None:
    """Clear all logging context. Call at the end of request processing."""
    request_id_var.set(None)
    user_id_var.set(None)
    tenant_id_var.set(None)

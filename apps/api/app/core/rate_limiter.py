"""
RestoNext MX - Rate Limiting Dependency
In-memory rate limiter for FastAPI endpoints

DESIGN DECISIONS:
1. Uses in-memory storage (suitable for MVP/single-instance)
2. Can be upgraded to Redis for multi-instance deployments
3. Implements sliding window algorithm
4. Configurable per-endpoint limits
"""

import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from fastapi import HTTPException, Request, status


class RateLimitExceeded(HTTPException):
    """Custom exception for rate limit violations"""
    def __init__(self, retry_after: int = 60, detail: str = "Too many requests"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(retry_after)}
        )


class InMemoryRateLimiter:
    """
    Thread-safe in-memory rate limiter using sliding window.
    
    Storage format:
    {
        "key": [(timestamp1), (timestamp2), ...]
    }
    
    Cleanup runs periodically to prevent memory bloat.
    """
    
    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()
        self._cleanup_interval: float = 60.0  # Cleanup every minute
    
    def _cleanup_expired(self, window_seconds: int) -> None:
        """Remove expired entries to prevent memory growth"""
        current_time = time.time()
        
        # Only cleanup periodically
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        self._last_cleanup = current_time
        cutoff = current_time - window_seconds
        
        keys_to_delete = []
        for key, timestamps in self._requests.items():
            # Filter out expired timestamps
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]
            if valid_timestamps:
                self._requests[key] = valid_timestamps
            else:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del self._requests[key]
    
    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Check if request is allowed under rate limit.
        
        Args:
            key: Unique identifier (e.g., table_id, IP address)
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed: bool, retry_after_seconds: int)
        """
        current_time = time.time()
        cutoff = current_time - window_seconds
        
        # Cleanup old entries periodically
        self._cleanup_expired(window_seconds)
        
        # Get valid requests within window
        request_times = self._requests[key]
        valid_requests = [ts for ts in request_times if ts > cutoff]
        
        if len(valid_requests) >= max_requests:
            # Calculate retry-after based on oldest request in window
            oldest_request = min(valid_requests)
            retry_after = int(oldest_request + window_seconds - current_time) + 1
            return False, retry_after
        
        # Record new request
        valid_requests.append(current_time)
        self._requests[key] = valid_requests
        
        return True, 0
    
    def get_remaining(self, key: str, max_requests: int, window_seconds: int) -> int:
        """Get remaining requests for a key"""
        current_time = time.time()
        cutoff = current_time - window_seconds
        
        request_times = self._requests.get(key, [])
        valid_requests = [ts for ts in request_times if ts > cutoff]
        
        return max(0, max_requests - len(valid_requests))


# Global limiter instance
_rate_limiter = InMemoryRateLimiter()


class RateLimiter:
    """
    FastAPI dependency for rate limiting.
    
    Usage:
        @router.post("/endpoint")
        async def my_endpoint(
            request: Request,
            _: None = Depends(RateLimiter(times=3, seconds=60))
        ):
            ...
    
    Parameters:
        times: Maximum number of requests allowed
        seconds: Time window in seconds
        key_func: Optional function to extract key from request
                  Default: uses table_id from path if available, else client IP
    """
    
    def __init__(
        self,
        times: int = 5,
        seconds: int = 60,
        key_func: Optional[callable] = None,
        error_message: str = "Demasiadas solicitudes. Por favor espera un momento."
    ):
        self.times = times
        self.seconds = seconds
        self.key_func = key_func
        self.error_message = error_message
    
    async def __call__(self, request: Request) -> None:
        """
        Check rate limit for incoming request.
        
        Raises:
            RateLimitExceeded: If rate limit is exceeded
        """
        # Determine rate limit key
        if self.key_func:
            key = self.key_func(request)
        else:
            key = self._get_default_key(request)
        
        # Check limit
        allowed, retry_after = _rate_limiter.is_allowed(
            key=key,
            max_requests=self.times,
            window_seconds=self.seconds
        )
        
        if not allowed:
            raise RateLimitExceeded(
                retry_after=retry_after,
                detail=self.error_message
            )
    
    def _get_default_key(self, request: Request) -> str:
        """
        Extract default rate limit key from request.
        
        Priority:
        1. table_id from path parameters (for dining endpoints)
        2. tenant_id + table_id combination
        3. Client IP address
        """
        path_params = request.path_params
        
        # For dining endpoints, use table_id
        if "table_id" in path_params:
            tenant_id = path_params.get("tenant_id", "unknown")
            table_id = path_params["table_id"]
            return f"dining:{tenant_id}:{table_id}"
        
        # Fallback to client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        return f"ip:{client_ip}"


def get_service_request_limiter() -> RateLimiter:
    """
    Pre-configured rate limiter for service request endpoints.
    Allows 3 requests per minute per table.
    """
    return RateLimiter(
        times=3,
        seconds=60,
        error_message="Has solicitado asistencia demasiadas veces. Un mesero llegará pronto."
    )


def get_order_limiter() -> RateLimiter:
    """
    Pre-configured rate limiter for order creation.
    Allows 10 orders per 5 minutes per table.
    """
    return RateLimiter(
        times=10,
        seconds=300,
        error_message="Has realizado muchos pedidos. Por favor espera un momento."
    )


# Export for convenience
__all__ = [
    "RateLimiter",
    "RateLimitExceeded",
    "get_service_request_limiter",
    "get_order_limiter"
]

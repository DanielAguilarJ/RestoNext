"""
RestoNext MX - Rate Limiting Dependency
Redis-backed rate limiter for FastAPI endpoints

DESIGN DECISIONS:
1. Uses Redis for distributed rate limiting across multiple API instances
2. Fallback to in-memory when Redis is unavailable
3. Implements sliding window algorithm
4. Configurable per-endpoint limits
5. Token bucket algorithm for smooth rate limiting

PRODUCTION FEATURES:
- Persists across server restarts
- Shared across multiple API instances
- Automatic cleanup via Redis TTL
"""

import time
import asyncio
from collections import defaultdict
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from fastapi import HTTPException, Request, status
import redis.asyncio as redis

from app.core.config import get_settings

settings = get_settings()


class RateLimitExceeded(HTTPException):
    """Custom exception for rate limit violations"""
    def __init__(self, retry_after: int = 60, detail: str = "Too many requests"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(retry_after)}
        )


class RedisRateLimiter:
    """
    Redis-backed rate limiter using sliding window algorithm.
    
    Provides distributed rate limiting that:
    - Survives API restarts
    - Works across multiple API instances
    - Uses Redis ZSET for efficient sliding window implementation
    
    Fallback to in-memory when Redis is unavailable.
    """
    
    _instance: Optional['RedisRateLimiter'] = None
    _lock = asyncio.Lock()
    
    def __init__(self):
        self._redis_client: Optional[redis.Redis] = None
        self._connected: bool = False
        self._fallback_storage: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()
        self._cleanup_interval: float = 60.0
    
    @classmethod
    async def get_instance(cls) -> 'RedisRateLimiter':
        """Get singleton instance of rate limiter"""
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
                    await cls._instance.connect()
        return cls._instance
    
    async def connect(self) -> bool:
        """
        Initialize Redis connection.
        Returns True if connected, False if fallback mode.
        """
        if self._redis_client is not None:
            return self._connected
        
        try:
            self._redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._redis_client.ping()
            self._connected = True
            print(f"INFO:     Rate Limiter connected to Redis at {settings.redis_url}")
            return True
        except Exception as e:
            print(f"WARNING:  Rate Limiter Redis connection failed: {e}. Using in-memory fallback.")
            self._redis_client = None
            self._connected = False
            return False
    
    async def disconnect(self):
        """Close Redis connection"""
        if self._redis_client:
            await self._redis_client.close()
            self._redis_client = None
            self._connected = False
    
    async def is_allowed(
        self, 
        key: str, 
        max_requests: int, 
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit.
        
        Args:
            key: Unique identifier (e.g., table_id, IP address)
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed: bool, retry_after_seconds: int, remaining: int)
        """
        if self._connected and self._redis_client:
            return await self._check_redis(key, max_requests, window_seconds)
        else:
            return self._check_memory(key, max_requests, window_seconds)
    
    async def _check_redis(
        self, 
        key: str, 
        max_requests: int, 
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        Redis-based sliding window rate limiting using ZSET.
        
        Each request is stored as a member with score = timestamp.
        We remove expired entries and count remaining.
        """
        redis_key = f"ratelimit:{key}"
        current_time = time.time()
        cutoff = current_time - window_seconds
        
        try:
            pipe = self._redis_client.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(redis_key, 0, cutoff)
            
            # Count current entries
            pipe.zcard(redis_key)
            
            # Execute pipeline
            results = await pipe.execute()
            current_count = results[1]
            
            if current_count >= max_requests:
                # Get oldest entry to calculate retry time
                oldest = await self._redis_client.zrange(
                    redis_key, 0, 0, withscores=True
                )
                if oldest:
                    oldest_time = oldest[0][1]
                    retry_after = int(oldest_time + window_seconds - current_time) + 1
                else:
                    retry_after = window_seconds
                
                remaining = 0
                return False, retry_after, remaining
            
            # Add new request
            await self._redis_client.zadd(redis_key, {str(current_time): current_time})
            
            # Set expiry on the key
            await self._redis_client.expire(redis_key, window_seconds + 10)
            
            remaining = max_requests - current_count - 1
            return True, 0, remaining
            
        except Exception as e:
            print(f"WARNING:  Redis rate limit error: {e}. Falling back to memory.")
            self._connected = False
            return self._check_memory(key, max_requests, window_seconds)
    
    def _check_memory(
        self, 
        key: str, 
        max_requests: int, 
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        In-memory fallback rate limiting.
        Uses sliding window algorithm.
        """
        current_time = time.time()
        cutoff = current_time - window_seconds
        
        # Cleanup periodically
        self._cleanup_expired(window_seconds)
        
        # Get valid requests within window
        request_times = self._fallback_storage[key]
        valid_requests = [ts for ts in request_times if ts > cutoff]
        
        if len(valid_requests) >= max_requests:
            oldest_request = min(valid_requests)
            retry_after = int(oldest_request + window_seconds - current_time) + 1
            return False, retry_after, 0
        
        # Record new request
        valid_requests.append(current_time)
        self._fallback_storage[key] = valid_requests
        
        remaining = max_requests - len(valid_requests)
        return True, 0, remaining
    
    def _cleanup_expired(self, window_seconds: int) -> None:
        """Remove expired entries from in-memory storage"""
        current_time = time.time()
        
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
        
        self._last_cleanup = current_time
        cutoff = current_time - window_seconds
        
        keys_to_delete = []
        for key, timestamps in self._fallback_storage.items():
            valid_timestamps = [ts for ts in timestamps if ts > cutoff]
            if valid_timestamps:
                self._fallback_storage[key] = valid_timestamps
            else:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del self._fallback_storage[key]
    
    async def get_remaining(
        self, 
        key: str, 
        max_requests: int, 
        window_seconds: int
    ) -> int:
        """Get remaining requests for a key"""
        _, _, remaining = await self.is_allowed(key, max_requests, window_seconds)
        return remaining
    
    async def reset(self, key: str) -> bool:
        """Reset rate limit for a specific key (useful for testing)"""
        redis_key = f"ratelimit:{key}"
        
        if self._connected and self._redis_client:
            try:
                await self._redis_client.delete(redis_key)
                return True
            except Exception:
                pass
        
        if key in self._fallback_storage:
            del self._fallback_storage[key]
        return True


# Global limiter instance (lazy initialized)
_rate_limiter: Optional[RedisRateLimiter] = None


async def get_rate_limiter() -> RedisRateLimiter:
    """Get the global rate limiter instance"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = await RedisRateLimiter.get_instance()
    return _rate_limiter


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
        limiter = await get_rate_limiter()
        
        # Determine rate limit key
        if self.key_func:
            key = self.key_func(request)
        else:
            key = self._get_default_key(request)
        
        # Check limit
        allowed, retry_after, remaining = await limiter.is_allowed(
            key=key,
            max_requests=self.times,
            window_seconds=self.seconds
        )
        
        # Add rate limit headers to request state for middleware to add to response
        request.state.rate_limit_remaining = remaining
        request.state.rate_limit_limit = self.times
        request.state.rate_limit_reset = self.seconds
        
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


def get_bill_request_limiter() -> RateLimiter:
    """
    Pre-configured rate limiter for bill requests.
    Allows 2 requests per 5 minutes per table.
    """
    return RateLimiter(
        times=2,
        seconds=300,
        error_message="Ya has solicitado la cuenta. Un mesero llegará pronto."
    )


# Export for convenience
__all__ = [
    "RateLimiter",
    "RateLimitExceeded",
    "RedisRateLimiter",
    "get_rate_limiter",
    "get_service_request_limiter",
    "get_order_limiter",
    "get_bill_request_limiter"
]

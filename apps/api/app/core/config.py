"""
RestoNext MX - Configuration Settings
Uses pydantic-settings for environment variable management
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql+asyncpg://restonext:restonext_dev@localhost:5432/restonext"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # JWT Auth
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours
    
    # App Info
    app_name: str = "RestoNext MX"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()

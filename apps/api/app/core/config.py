import json
import os
from functools import lru_cache
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql+asyncpg://restonext:restonext_dev@localhost:5432/restonext"
    
    @model_validator(mode='after')
    def fix_database_url(self) -> 'Settings':
        """Substitute postgres:// with postgresql+asyncpg:// for Railway/Heroku compatibility"""
        if self.database_url and self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif self.database_url and self.database_url.startswith("postgresql://") and "+asyncpg" not in self.database_url:
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # JWT Auth
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours
    
    # App Info
    app_name: str = "RestoNext MX"
    debug: bool = False  # Default False for production, set DEBUG=true in dev
    
    # CORS Configuration
    # Can be set via BACKEND_CORS_ORIGINS env var as JSON array
    # Example: '["https://restonext.vercel.app", "https://myrestaurant.com"]'
    backend_cors_origins: Optional[str] = None
    
    @property
    def allowed_origins(self) -> list[str]:
        """
        Get allowed CORS origins.
        
        Reads from BACKEND_CORS_ORIGINS env var (JSON array) if set,
        otherwise falls back to defaults.
        """
        # Default origins
        defaults = [
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            "https://resto-next-ten.vercel.app"
        ]
        
        # Try to parse BACKEND_CORS_ORIGINS from environment
        cors_env = self.backend_cors_origins or os.getenv("BACKEND_CORS_ORIGINS", "")
        
        if cors_env:
            try:
                # Parse as JSON array
                parsed = json.loads(cors_env)
                if isinstance(parsed, list):
                    # Combine with defaults, remove duplicates
                    return list(dict.fromkeys(defaults + [str(o) for o in parsed]))
            except json.JSONDecodeError:
                # Try comma-separated fallback
                origins = [o.strip() for o in cors_env.split(",") if o.strip()]
                if origins:
                    return list(dict.fromkeys(defaults + origins))
        
        return defaults
    
    # SMTP Email Configuration
    smtp_host: str = ""  # e.g., smtp.gmail.com
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""  # Defaults to smtp_user if not set
    smtp_from_name: str = "RestoNext MX"
    smtp_tls: bool = True
    smtp_ssl: bool = False
    
    # PAC (Proveedor Autorizado de Certificación) Configuration
    pac_provider: str = "mock"  # mock, finkok, facturama
    finkok_username: str = ""
    finkok_password: str = ""
    finkok_sandbox: bool = True
    
    # AI Integration
    perplexity_api_key: str = ""
    
    # Observability - Sentry
    sentry_dsn: str = ""  # Empty = disabled
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = 0.1  # 10% of transactions
    
    # Backup Configuration
    backup_retention_days: int = 7
    backup_max_size_gb: int = 5
    backup_admin_email: str = ""  # Email to notify on backup status
    
    # Stripe Configuration (B2B Subscription Billing)
    stripe_secret_key: str = ""  # sk_live_xxx or sk_test_xxx
    stripe_publishable_key: str = ""  # pk_live_xxx or pk_test_xxx
    stripe_webhook_secret: str = ""  # whsec_xxx
    stripe_price_id_starter: str = ""  # price_xxx for Starter plan
    stripe_price_id_professional: str = ""  # price_xxx for Professional plan
    stripe_price_id_enterprise: str = ""  # price_xxx for Enterprise plan
    
    # Frontend URL (for Stripe redirects)
    frontend_url: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()


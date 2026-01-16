from functools import lru_cache
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
    debug: bool = True
    allowed_origins: list[str] = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://resto-next-ten.vercel.app"
    ]
    
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
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()

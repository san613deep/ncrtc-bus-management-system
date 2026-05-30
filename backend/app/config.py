"""
config.py — Application Settings
=================================
All configuration comes from environment variables (12-Factor App principle).
Never hardcode secrets in your source code.

Pydantic-settings reads from:
1. Environment variables (set in Docker Compose or your shell)
2. .env file (for local development)
"""

from pydantic_settings import BaseSettings
from pydantic import AnyUrl
from functools import lru_cache


class Settings(BaseSettings):
    """
    Each field maps to an environment variable with the SAME NAME (uppercase).
    If the variable is missing, the default value is used.
    Required fields (no default) will raise an error at startup — good!
    """

    # --- App ---
    app_name: str = "NCRTC Bus Management System API"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    # --- Database (PostgreSQL) ---
    database_url: str  # Required — no default

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- JWT ---
    jwt_secret: str  # Required — no default
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # --- Internal Service Communication ---
    internal_api_key: str  # Required — used by FastAPI to call Spring Boot
    scheduling_service_url: str = "http://scheduling-service:8080"

    # --- GPS Tick Script Authentication ---
    tick_api_key: str  # Required — tick script uses this to POST GPS pings

    # --- AWS S3 (for photo uploads) ---
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    s3_bucket_name: str = "ncrtc-bms-uploads"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    class Config:
        env_file = ".env"      # Load from .env in local dev
        case_sensitive = False  # DATABASE_URL and database_url both work


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance.
    @lru_cache ensures Settings() is only created once — not on every request.
    Use this function everywhere you need settings:
        from app.config import get_settings
        settings = get_settings()
    """
    return Settings()

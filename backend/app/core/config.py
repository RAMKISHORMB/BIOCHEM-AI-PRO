import os
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "BIOCHEM AI — Clinical Biochemistry Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & Initial Provisioning
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "biochem-ai-development-testing-key-not-for-production-hs256")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Initial Administrator Credentials (Exclusively provisioned via environment variables)
    ADMIN_EMAIL: Optional[str] = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD: Optional[str] = os.getenv("ADMIN_PASSWORD")

    @model_validator(mode="after")
    def validate_production_security(self):
        """Enforces that production environments have a secure, non-fallback SECRET_KEY."""
        if self.ENVIRONMENT.lower() in ("production", "prod"):
            sec = self.SECRET_KEY
            if not sec or len(sec.strip()) < 32 or "security-seed" in sec or "development-testing-key" in sec:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY environment variable "
                    "must be explicitly defined in production with a strong, cryptographically "
                    "secure random value (minimum 32 characters). Insecure fallback is strictly prohibited."
                )
        return self
    
    # Database: Defaults to PostgreSQL if configured, or local persistent SQLite if Postgres not running
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./biochem_ai.db"
    )
    
    # Ollama Local AI Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_DEFAULT_MODEL: str = os.getenv("OLLAMA_DEFAULT_MODEL", "llama3")
    
    # Storage Directories
    DATA_DIR: str = os.getenv("DATA_DIR", "./data")
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
    MODEL_REGISTRY_DIR: str = os.getenv("MODEL_REGISTRY_DIR", "./data/models")
    REPORT_OUTPUT_DIR: str = os.getenv("REPORT_OUTPUT_DIR", "./data/reports")
    
    # CORS Origins
    @property
    def cors_origins(self) -> list[str]:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        env_origins = os.getenv("BACKEND_CORS_ORIGINS") or os.getenv("CORS_ORIGINS")
        if env_origins:
            parsed = [o.strip() for o in env_origins.split(",") if o.strip() and o.strip() != "*"]
            for o in parsed:
                if o not in origins:
                    origins.append(o)
        return origins

    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure local runtime data directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(settings.MODEL_REGISTRY_DIR, exist_ok=True)
os.makedirs(settings.REPORT_OUTPUT_DIR, exist_ok=True)

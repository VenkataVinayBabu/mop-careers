"""Application configuration, loaded from .env. No secret is ever hardcoded."""
import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Where uploaded notes PDFs live.
#
# Overridable because the right answer depends on the host, and getting it
# wrong is silent: on Render's free tier this directory sits inside the
# deployment and every upload is wiped on the next deploy, which is exactly
# what has been happening. Azure App Service mounts `/home` on persistent
# storage, so setting UPLOAD_DIR=/home/data there makes the files survive
# without needing object storage at all.
#
# Read straight from the environment rather than through Settings below: the
# module-level mkdir at the bottom of this file runs at import, before the
# settings object exists.
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR") or (BACKEND_DIR / "uploads"))
NOTES_DIR = UPLOAD_DIR / "notes"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str

    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    RESET_TOKEN_EXPIRE_MINUTES: int = 60

    # App
    APP_ENV: str = "dev"
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Object storage for uploaded files.
    #
    # Leave S3_BUCKET empty and uploads go to local disk, exactly as they
    # always have — a developer should not need AWS credentials to run the
    # app. Set it and they go to S3 instead. See app/storage.py.
    #
    # The AWS credentials are declared here so that a local .env works. boto3
    # reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from the process
    # environment, which a .env file never reaches -- so without these fields
    # S3 fails locally with "Unable to locate credentials" while working
    # perfectly on a host that sets real environment variables.
    #
    # Leaving them EMPTY is meaningful: storage.py then lets boto3 find
    # credentials its own way, which is how an IAM role is picked up when the
    # app runs inside AWS. Moving from keys to a role is deleting two values,
    # not editing code.
    S3_BUCKET: str = ""
    S3_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # Anthropic (phases 3 & 4)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "no-reply@mopcareers.com"
    ENQUIRY_EMAIL: str = "enquiries@mopcareers.com"
    ADMIN_DOUBTS_EMAIL: str = "doubts@mopcareers.com"

    @property
    def sqlalchemy_url(self) -> str:
        """Managed hosts (Render, Heroku, Railway) hand out URLs starting with
        `postgres://`, which SQLAlchemy 2.0 no longer recognises. Normalise it
        here rather than depending on whoever sets the environment variable.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.APP_ENV.lower() in {"dev", "development", "local"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

NOTES_DIR.mkdir(parents=True, exist_ok=True)

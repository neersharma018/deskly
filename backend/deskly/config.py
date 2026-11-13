from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    database_url: str = "postgresql+psycopg://deskly:deskly@127.0.0.1:5432/deskly"
    redis_url: str = ""
    app_origin: str = "http://localhost:3000"
    environment: Literal["development", "test", "production"] = "development"
    sample_catalogue: bool = True
    seed_admin_email: str = ""
    seed_admin_password: str = ""
    shipping_paise: int = 9900
    free_shipping_paise: int = 500000
    tax_bps: int = 0
    cash_on_delivery: bool = False
    demo_checkout: bool = False
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    s3_bucket: str = ""
    s3_endpoint: str = ""
    s3_public_url: str = ""
    s3_region: str = "ap-south-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""

    @model_validator(mode="after")
    def validate_deployment(self):
        if min(self.shipping_paise, self.free_shipping_paise, self.tax_bps) < 0 or self.tax_bps > 10000:
            raise ValueError("Invalid shipping or tax configuration")
        if self.environment == "production" and (not self.app_origin.startswith("https://") or not self.redis_url):
            raise ValueError("Production requires an HTTPS APP_ORIGIN and REDIS_URL")
        if self.demo_checkout and (self.environment == "production" or not self.sample_catalogue):
            raise ValueError("Demo checkout requires a development or test sample catalogue")
        if self.environment != "production" and self.razorpay_key_id and not self.razorpay_key_id.startswith("rzp_test_"):
            raise ValueError("Use Razorpay test credentials outside production")
        if bool(self.aws_access_key_id) != bool(self.aws_secret_access_key):
            raise ValueError("Configure both S3 credential fields or use the default credential chain")
        return self


@lru_cache
def settings() -> Settings:
    return Settings()

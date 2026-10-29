from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import urlsplit


class Settings(BaseSettings):
    supabase_url: str = Field(min_length=8)
    supabase_anon_key: str = Field(min_length=10)
    openweather_api_key: str = Field(min_length=10)
    allowed_origins: str = "http://localhost:3000,http://localhost:8080,http://localhost:8081,http://127.0.0.1:8081"
    pose_model_path: str = "/models/pose_landmarker_lite.task"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("supabase_url")
    @classmethod
    def secure_url(cls, value):
        if not value.startswith("https://"):
            raise ValueError("Supabase URL must use HTTPS")
        return value.rstrip("/")

    @property
    def origins(self):
        return [s.strip() for s in self.allowed_origins.split(",") if s.strip()]

    @property
    def guest_demo_enabled(self):
        """Enable guest analysis only for a local-only classroom/demo setup."""
        hosts = [urlsplit(origin).hostname for origin in self.origins]
        return bool(hosts) and all(host in {"localhost", "127.0.0.1", "::1"} for host in hosts)


@lru_cache
def settings():
    return Settings()

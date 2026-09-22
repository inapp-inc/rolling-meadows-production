from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+asyncpg://case_management:case_management@localhost:5432/case_management"
    )
    database_echo: bool = False
    api_enabled_modules: str = "health,auth"

    jwt_secret: str = "dev-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 30
    enforce_https: bool = False
    trust_proxy: bool = False
    cors_origins: str = "http://localhost:8080,http://localhost:5173"
    seed_user_password: str = "ChangeMe123!"
    default_tenant_id: str = "tenant-demo"

    # Production (single-port): set APP_BASE_PATH and PUBLIC_URL for your deployment host
    app_base_path: str = ""
    public_url: str = "http://localhost:4510/case-management"
    static_dir: str = "/app/static"
    branding_dir: str = "/app/branding"
    app_port: int = 4510

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def enabled_modules(self) -> set[str]:
        return {m.strip().lower() for m in self.api_enabled_modules.split(",") if m.strip()}

    @property
    def base_path(self) -> str:
        """Normalized base path without trailing slash, e.g. `/case-management`."""
        value = self.app_base_path.strip().rstrip("/")
        return value if value and value != "/" else ""

    @property
    def api_mount_path(self) -> str:
        return f"{self.base_path}/api" if self.base_path else "/api"

    @property
    def api_root_path(self) -> str:
        """OpenAPI root path when served behind a reverse proxy."""
        return self.api_mount_path


settings = Settings()

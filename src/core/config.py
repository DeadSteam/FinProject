import os
import json
from typing import Any, List, Dict
from pydantic import BaseModel, Field, ConfigDict, computed_field
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

# Получаем абсолютный путь к корневой директории проекта
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = ROOT_DIR / ".env"

print(f"[CONFIG] Путь к .env файлу: {ENV_FILE}")
print(f"[CONFIG] Файл существует: {ENV_FILE.exists()}")
print(f"[CONFIG] Текущая директория: {os.getcwd()}")

def get_cors_origins(v: Any) -> List[str]:
    if isinstance(v, str):
        # Удаляем комментарии и лишние пробелы
        cleaned_value = v.split("#")[0].strip()
        return [i.strip() for i in cleaned_value.split(",")]
    return v

def clean_env_value(value: str) -> str:
    """Очищает значение переменной окружения от комментариев и лишних пробелов."""
    if "#" in value:
        value = value.split("#")[0]
    return value.strip()

class Settings(BaseSettings):
    # Server
    HOST: str
    PORT: int

    # Database Connection Pool
    DB_POOL_SIZE: int
    DB_MAX_OVERFLOW: int
    DB_POOL_TIMEOUT: int

    # Application
    APP_NAME: str
    APP_ENV: str
    DEBUG: bool
    
    # API
    API_VERSION: str
    API_PREFIX: str
    
    # Security
    SECRET_KEY: str
    SESSION_MAX_AGE: int
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # CORS
    CORS_ORIGINS: str
    
    # Docker
    COMPOSE_PROJECT_NAME: str
    
    # PgAdmin
    PGADMIN_DEFAULT_EMAIL: str
    PGADMIN_DEFAULT_PASSWORD: str
    
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    FINANCE_DB: str
    USERS_DB: str
    FINANCE_PORT: str
    USERS_PORT: str
    FINANCE_DB_HOST: str
    USERS_DB_HOST: str
    
    # Redis
    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB: int
    REDIS_DEFAULT_TIMEOUT: int

    # Middleware settings
    CORS_MAX_AGE: int
    GZIP_MINIMUM_SIZE: int
    ALLOWED_HOSTS: str
    SESSION_HTTPS_ONLY: bool
    SESSION_SAME_SITE: str

    # Documentation settings
    DOCS_TITLE: str
    DOCS_DESCRIPTION: str
    DOCS_VERSION: str
    DOCS_CONTACT_NAME: str
    DOCS_CONTACT_EMAIL: str
    DOCS_LICENSE_NAME: str
    DOCS_LICENSE_URL: str

    # Root Message
    ROOT_MESSAGE: str

    # JWT Settings
    JWT_ALGORITHM: str
    REFRESH_TOKEN_EXPIRE_DAYS: int
    COOKIE_MAX_AGE: int

    # Auth Cookie Settings
    AUTH_COOKIE_SECURE: bool
    AUTH_COOKIE_SAME_SITE: str
    AUTH_COOKIE_PATH: str

    # Rate Limiting Settings
    MAX_FAILED_ATTEMPTS: int
    LOGIN_LOCKOUT_TIME: int
    AUTH_RATE_LIMIT_MINUTE: int
    AUTH_RATE_LIMIT_HOUR: int

    # OAuth2 Settings
    OAUTH2_TOKEN_URL: str

    # Admin Settings
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
        env_nested_delimiter="__",
        env_ignore_empty=True,
        env_prefix="",
        validate_default=False,
        env_file_path=ENV_FILE,
        env_parse_file=True,
        # Игнорируем системные переменные окружения
        env_ignore_env_vars=True
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return get_cors_origins(self.CORS_ORIGINS)

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",") if host.strip()]

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        url = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.FINANCE_DB_HOST}:{self.FINANCE_PORT}/{self.FINANCE_DB}"
        print(f"[CONFIG] Сгенерирован DATABASE_URL: {url}")
        return url

    @computed_field
    @property
    def USERS_DATABASE_URL(self) -> str:
        url = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.USERS_DB_HOST}:{self.USERS_PORT}/{self.USERS_DB}"
        print(f"[CONFIG] Сгенерирован USERS_DATABASE_URL: {url}")
        return url

    @computed_field
    @property
    def REDIS_URL(self) -> str:
        url = f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        print(f"[CONFIG] Сгенерирован REDIS_URL: {url}")
        return url

    def __init__(self, **kwargs):
        print("\n[CONFIG] Начало инициализации Settings")
        print(f"[CONFIG] Переданные аргументы: {kwargs}")
        
        # Читаем только .env файл
        env_file_values = {}
        try:
            with open(ENV_FILE, "r") as f:
                print(f"[CONFIG] Чтение файла .env")
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = clean_env_value(value)
                        env_file_values[key] = value
                        print(f"[CONFIG] Загружена переменная из .env: {key} = {value}")
        except Exception as e:
            print(f"[CONFIG] Ошибка при чтении .env файла: {str(e)}")
        
        print(f"[CONFIG] Значения из .env: {env_file_values}")
        
        super().__init__(**env_file_values)
        print("[CONFIG] Завершение инициализации Settings")
        
        # Выводим итоговые значения
        print("\n[CONFIG] Итоговые значения:")
        for field in self.model_fields:
            value = getattr(self, field)
            print(f"[CONFIG] {field} = {value}")

@lru_cache()
def get_settings() -> Settings:
    print("[CONFIG] Создание экземпляра Settings")
    settings = Settings()
    return settings

print("[CONFIG] Инициализация конфигурации")
settings = get_settings()
print("[CONFIG] Конфигурация загружена")
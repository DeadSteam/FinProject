import os
from typing import Any, List
from pydantic import BaseModel, Field, ConfigDict

class RunConfig(BaseModel):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class ApiPrefix(BaseModel):
    PREFIX: str = "/api/v1"
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class DatabaseConfig(BaseModel):
    URL: str  # Используем str вместо PostgresDsn
    ECHO: bool = False
    ECHO_POOL: bool = False
    POOL_SIZE: int = 50
    MAX_OVERFLOW: int = 10
    
    model_config = ConfigDict(arbitrary_types_allowed=True)

class Settings(BaseModel):
    # Базовые настройки
    RUN: RunConfig = RunConfig()
    API: ApiPrefix = ApiPrefix()
    PROJECT_NAME: str = "Finance API"
    API_V1_STR: str = "/api/v1"
    
    # Настройки CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost", 
        "http://localhost:63343",  # JetBrains WebStorm/PyCharm порт
        "http://127.0.0.1:63343",  # JetBrains порт (IP версия)
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:63343",
        "http://localhost:5500",       # VS Code Live Server
        "http://127.0.0.1:5500",       # VS Code Live Server
        "file://",                    # Открытие локального файла напрямую
    ]
    
    # Наружу предоставляем CORS_ORIGINS для middleware
    @property
    def CORS_ORIGINS(self) -> List[str]:
        # Возвращаем список разрешенных источников
        return self.BACKEND_CORS_ORIGINS
    
    # Настройки сессий
    SESSION_MAX_AGE: int = 14 * 24 * 60 * 60  # 14 дней в секундах
    
    # Настройки JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 дней
    
    # Настройки баз данных
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Akrawer1@localhost:5434/finance_db"
    USERS_DATABASE_URL: str = "postgresql+asyncpg://postgres:Akrawer1@localhost:5435/users_db"
    
    # Автоматическое создание объектов конфигурации баз данных
    @property
    def FINANCE_DATABASE(self) -> DatabaseConfig:
        return DatabaseConfig(URL=self.DATABASE_URL)
    
    @property
    def USERS_DATABASE(self) -> DatabaseConfig:
        return DatabaseConfig(URL=self.USERS_DATABASE_URL)
    
    # Другие настройки
    DEBUG: bool = True
    SECRET_KEY: str = "your-secret-key-here"
    COMPOSE_PROJECT_NAME: str = "docker_zavod"
    APP_ENV: str = "development"

    model_config = ConfigDict(
        env_file=".env",  # Поиск .env в текущем каталоге
        case_sensitive=False,
        arbitrary_types_allowed=True
    )

# Функция для получения настроек приложения
def get_app_settings() -> Settings:
    return settings

settings = Settings()
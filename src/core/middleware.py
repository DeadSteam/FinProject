from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.sessions import SessionMiddleware

from src.core.config import get_app_settings


def setup_middlewares(app: FastAPI) -> None:
    """
    Настройка middleware для приложения.
    """
    settings = get_app_settings()
    
    # Настройка CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,
    )
    
    # Добавляем middleware для сжатия ответов
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Защита от атак через фиксацию хоста
    # В реальном приложении нужно указать список разрешенных хостов
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["*"]  # В продакшене нужно указать конкретные хосты
    )
    
    # Добавляем поддержку сессий
    app.add_middleware(
        SessionMiddleware, 
        secret_key=settings.SECRET_KEY,
        max_age=settings.SESSION_MAX_AGE,
        https_only=True,  # Требуется HTTPS
        same_site="lax"   # Защита от CSRF атак
    ) 
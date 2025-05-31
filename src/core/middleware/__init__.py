from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.sessions import SessionMiddleware

from src.core.config import get_settings
from src.core.middleware.rate_limit import AuthRateLimitMiddleware

def setup_middlewares(app: FastAPI) -> None:
    """
    Настройка middleware для приложения.
    """
    settings = get_settings()
    
    # Настройка CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=settings.CORS_MAX_AGE,
    )
    
    # Добавляем middleware для сжатия ответов
    app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)
    
    # Защита от атак через фиксацию хоста
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=settings.allowed_hosts_list
    )
    
    # Добавляем поддержку сессий
    app.add_middleware(
        SessionMiddleware, 
        secret_key=settings.SECRET_KEY,
        max_age=settings.SESSION_MAX_AGE,
        https_only=settings.SESSION_HTTPS_ONLY,
        same_site=settings.SESSION_SAME_SITE
    )

    # Добавляем rate limiting для auth эндпоинтов
    app.add_middleware(AuthRateLimitMiddleware) 
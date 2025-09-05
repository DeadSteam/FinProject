from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Literal, Any, List, Dict
import json
from pydantic import ValidationError
from starlette.responses import Response as StarletteResponse

from src.core.config import get_settings
from src.core.middleware.rate_limit import AuthRateLimitMiddleware


class ValidationErrorMiddleware(BaseHTTPMiddleware):
    """Middleware для отлова и логирования ошибок валидации."""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except ValidationError as e:
            print(f"Validation error on {request.method} {request.url}: {e}")
            print(f"Validation error details: {e.errors()}")
            return JSONResponse(
                status_code=422,
                content={"detail": f"Validation error: {e.errors()}"}
            )
        except Exception as e:
            print(f"Unexpected error on {request.method} {request.url}: {e}")
            print(f"Error type: {type(e)}")
            raise


def setup_middlewares(app: FastAPI) -> None:
    """
    Настройка middleware для приложения.
    """
    settings = get_settings()
    
    # Логируем CORS настройки
    print(f"[CORS] Настройка CORS Origins: {settings.cors_origins_list}")
    
    # Добавляем middleware для отлова ошибок валидации
    app.add_middleware(ValidationErrorMiddleware)
    
    # Настройка CORS - используем settings из .env
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,  # Только origins из .env
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,
    )
    
    # Добавляем middleware для сжатия ответов
    app.add_middleware(GZipMiddleware, minimum_size=settings.GZIP_MINIMUM_SIZE)
    
    # Защита от атак через фиксацию хоста
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=settings.allowed_hosts_list
    )

    # Добавляем поддержку сессий
    same_site_value = 'lax'
    if hasattr(settings, 'SESSION_SAME_SITE') and settings.SESSION_SAME_SITE.lower() in ['lax', 'strict', 'none']:
        same_site_value = settings.SESSION_SAME_SITE.lower()
    
    app.add_middleware(
        SessionMiddleware, 
        secret_key=settings.SECRET_KEY,
        max_age=settings.SESSION_MAX_AGE,
        https_only=settings.SESSION_HTTPS_ONLY,
        same_site=same_site_value  # type: ignore
    )

    # Добавляем rate limiting для auth эндпоинтов
    app.add_middleware(AuthRateLimitMiddleware)
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from src.core.config import settings

class RateLimitStore:
    def __init__(self):
        self._store: Dict[str, List[Tuple[datetime, int]]] = {}
    
    def _clean_old_requests(self, client_ip: str, current_time: datetime):
        """Очищает старые запросы."""
        if client_ip in self._store:
            # Удаляем записи старше часа
            self._store[client_ip] = [
                (time, count) for time, count in self._store[client_ip]
                if current_time - time < timedelta(hours=1)
            ]
    
    def add_request(self, client_ip: str, current_time: datetime) -> bool:
        """Добавляет новый запрос и проверяет лимиты."""
        self._clean_old_requests(client_ip, current_time)
        
        if client_ip not in self._store:
            self._store[client_ip] = [(current_time, 1)]
            return True
        
        # Проверяем лимиты
        minute_ago = current_time - timedelta(minutes=1)
        hour_ago = current_time - timedelta(hours=1)
        
        # Подсчитываем запросы за последнюю минуту и час
        minute_requests = sum(
            count for time, count in self._store[client_ip]
            if time > minute_ago
        )
        hour_requests = sum(
            count for time, count in self._store[client_ip]
            if time > hour_ago
        )
        
        # Проверяем лимиты
        if (minute_requests >= settings.AUTH_RATE_LIMIT_MINUTE or
            hour_requests >= settings.AUTH_RATE_LIMIT_HOUR):
            return False
        
        # Добавляем новый запрос
        self._store[client_ip].append((current_time, 1))
        return True


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.rate_limit_store = RateLimitStore()
    
    async def dispatch(self, request: Request, call_next):
        """Обработка запроса с проверкой rate limit."""
        # Проверяем только запросы к auth эндпоинтам
        if request.url.path.startswith("/api/v1/auth/"):
            client_ip = request.client.host
            current_time = datetime.now()
            
            if not self.rate_limit_store.add_request(client_ip, current_time):
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Слишком много запросов. Пожалуйста, попробуйте позже."
                    }
                )
        
        return await call_next(request) 
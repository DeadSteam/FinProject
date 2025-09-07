from fastapi import APIRouter

from src.api.v1.endpoints import finance, users, auth, user_avatars, analytics
from src.api.v1 import render_slides

api_router = APIRouter(prefix="/v1")

api_router.include_router(finance.router, prefix="/finance")
api_router.include_router(users.router, prefix="/users", tags=["Пользователи"])
api_router.include_router(auth.router, prefix="/auth", tags=["Авторизация"])
api_router.include_router(user_avatars.router, prefix="/avatars", tags=["Аватары пользователей"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Аналитика"])
api_router.include_router(render_slides.router, prefix="/reports", tags=["Рендеринг отчетов"]) 
from fastapi import APIRouter

from src.api.v1.endpoints import finance, users, auth

api_router = APIRouter()

api_router.include_router(finance.router, prefix="/finance")
api_router.include_router(users.router, prefix="/users", tags=["Пользователи"])
api_router.include_router(auth.router, prefix="/auth", tags=["Авторизация"]) 
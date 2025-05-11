from fastapi import FastAPI

from src.core.config import settings
from src.core.middleware import setup_middlewares
from src.api.v1.router import api_router

# Определяем порядок тегов для документации
tags_metadata = [
    {"name": "Магазины", "description": "Операции с магазинами"},
    {"name": "Категории", "description": "Операции с категориями расходов"},
    {"name": "Метрики", "description": "Операции с метриками"},
    {"name": "Периоды", "description": "Операции с временными периодами"},
    {"name": "Плановые значения", "description": "Операции с плановыми значениями метрик"},
    {"name": "Фактические значения", "description": "Операции с фактическими значениями метрик"},
    {"name": "Изображения", "description": "Операции с изображениями"},
    {"name": "Аналитика", "description": "Аналитические отчеты"},
    {"name": "Пользователи", "description": "Управление пользователями"},
    {"name": "Авторизация", "description": "Авторизация и аутентификация"}
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    openapi_tags=tags_metadata
)

# Настройка middleware
setup_middlewares(app)

# Подключение API роутера
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Добро пожаловать в Finance API"}

from fastapi import FastAPI

from src.core.config import settings
from src.core.middleware import setup_middlewares
from src.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Настройка middleware
setup_middlewares(app)

# Подключение API роутера
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Добро пожаловать в Finance API"}

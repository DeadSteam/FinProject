from fastapi import APIRouter, Request, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter()

class AnalyticsEvent(BaseModel):
    id: str
    name: str
    category: str
    priority: str = "normal"
    tags: list = []
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

@router.post(
    "/",
    name="analytics:submit_event",
    status_code=204,
)
async def submit_analytics_event(
    event: AnalyticsEvent,
):
    """
    Принимает и обрабатывает события аналитики от клиента.

    В данный момент эндпоинт является заглушкой и просто принимает данные,
    возвращая статус 204 No Content.
    В будущем здесь может быть добавлена логика для сохранения
    событий в базу данных или отправки их в систему аналитики.
    """
    # В будущем здесь будет логика сохранения в БД
    # print(f"Received analytics event: {event}")
    return Response(status_code=204)

@router.get(
    "/",
    name="analytics:get_events",
    status_code=200,
)
async def get_analytics_events():
    """
    Возвращает список событий аналитики.
    
    В данный момент возвращает пустой список, так как события
    не сохраняются в базе данных.
    """
    return {
        "events": [],
        "total": 0,
        "status": "success"
    } 
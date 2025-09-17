from fastapi import APIRouter, Request, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union

router = APIRouter()

class AnalyticsEvent(BaseModel):
    id: str
    name: str
    category: str
    priority: str = "normal"
    tags: list = []
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

class AnalyticsBatch(BaseModel):
    events: List[AnalyticsEvent]

@router.post(
    "/",
    name="analytics:submit_event",
    status_code=204,
)
async def submit_analytics_event(
    payload: Union[AnalyticsEvent, AnalyticsBatch]
):
    """
    Принимает и обрабатывает события аналитики от клиента.

    Поддерживаются два формата тела запроса:
    1) Одиночное событие (AnalyticsEvent)
    2) Батч событий { "events": [AnalyticsEvent, ...] }
    """
    # В будущем здесь будет логика сохранения в БД/очередь
    # Приводим к списку для унификации
    try:
        events: List[AnalyticsEvent]
        if isinstance(payload, AnalyticsEvent):
            events = [payload]
        else:
            events = payload.events or []
        # Ничего не сохраняем, просто подтверждаем прием
        # print(f"Received {len(events)} analytics events")
    except Exception:
        # Даже при ошибке не валим клиента, чтобы аналитика не мешала UX
        pass
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
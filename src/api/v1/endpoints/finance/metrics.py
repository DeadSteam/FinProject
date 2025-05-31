from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import Metric, MetricCreate, MetricUpdate, MetricWithCategory
from src.api.v1.endpoints.finance.utils import finances_db, metric_service

router = APIRouter()

@router.get("", response_model=List[Metric])
async def get_metrics(
    category_id: Optional[UUID] = None,
    store_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение списка метрик с фильтрацией.
    
    Args:
        category_id: ID категории для фильтрации
        store_id: ID магазина для фильтрации
        skip: Смещение для пагинации
        limit: Ограничение для пагинации
    """
    return await metric_service.get_metrics_by_filters(
        session=session,
        category_id=category_id,
        store_id=store_id,
        skip=skip,
        limit=limit
    )

@router.get("/search", response_model=List[MetricWithCategory])
async def search_metrics(
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Поиск метрик по параметрам.
    
    Args:
        search: Поисковый запрос для фильтрации по имени
        category_id: ID категории для фильтрации
        skip: Смещение для пагинации
        limit: Ограничение для пагинации
    """
    metrics = await metric_service.search_metrics(
        session=session,
        search=search,
        category_id=category_id,
        skip=skip,
        limit=limit
    )
    
    # Конвертируем результаты в формат для ответа
    result = []
    for metric in metrics:
        # Получаем детальную информацию о метрике с категорией
        metric_with_category = await metric_service.get_with_relations(metric.id, session)
        if metric_with_category:
            result.append(metric_with_category)
    
    return result

@router.get("/with-data", response_model=List[Dict])
async def get_metrics_with_data(
    shop_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    year: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение метрик с данными для графиков.
    
    Args:
        shop_id: ID магазина для фильтрации
        category_id: ID категории для фильтрации
        year: Год для фильтрации данных
        session: Сессия БД
    """
    # Определяем год, если не указан
    if not year:
        current_year = datetime.now().year
        year = current_year
        
    return await metric_service.get_metrics_with_values_for_charts(
        session=session,
        shop_id=shop_id,
        category_id=category_id,
        year=year
    )

@router.post("", response_model=Metric)
async def create_metric(
    metric_in: MetricCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Создание новой метрики.
    
    Args:
        metric_in: Данные для создания метрики
        session: Сессия БД
    """
    # Проверяем, существует ли категория
    existing_metric = await metric_service.get_by_name_and_category(
        name=metric_in.name,
        category_id=metric_in.category_id,
        session=session
    )
    if existing_metric:
        raise HTTPException(
            status_code=400, 
            detail=f"Метрика с именем '{metric_in.name}' уже существует в данной категории"
        )
        
    return await metric_service.create(metric_in, session=session)

@router.get("/{metric_id}", response_model=MetricWithCategory)
async def get_metric(
    metric_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение данных метрики по ID.
    
    Args:
        metric_id: ID метрики
        session: Сессия БД
    """
    metric = await metric_service.get_with_relations(id=metric_id, session=session)
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    return metric

@router.put("/{metric_id}", response_model=Metric)
async def update_metric(
    metric_id: UUID, 
    metric_in: MetricUpdate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Обновление данных метрики.
    
    Args:
        metric_id: ID метрики
        metric_in: Данные для обновления
        session: Сессия БД
    """
    metric = await metric_service.get(id=metric_id, session=session)
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    return await metric_service.update(id=metric_id, obj_in=metric_in, session=session)

@router.delete("/{metric_id}", status_code=200)
async def delete_metric(
    metric_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Удаление метрики.
    
    Args:
        metric_id: ID метрики
        session: Сессия БД
    """
    metric = await metric_service.get(id=metric_id, session=session)
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    result = await metric_service.delete(id=metric_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении метрики")
    return {"status": "success", "message": "Метрика успешно удалена"} 

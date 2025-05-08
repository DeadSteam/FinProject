from typing import List, Optional, Dict, Any
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.repository.db import finances_db
from src.scheme.finance import (
    Category, CategoryCreate, CategoryUpdate, CategoryWithRelations,
    Shop, ShopCreate, ShopUpdate,
    Metric, MetricCreate, MetricUpdate, MetricWithCategory,
    ActualValue, ActualValueCreate, ActualValueUpdate, ActualValueWithRelations,
    PlanValue, PlanValueCreate, PlanValueUpdate, PlanValueWithRelations,
    Period, PeriodCreate, PeriodUpdate,
    Image, ImageCreate, ImageUpdate
)
from src.service.finance import (
    CategoryService, ShopService, MetricService, 
    ActualValueService, PlanValueService, PeriodService,
    ImageService
)

router = APIRouter()

# Получение сессии БД
async def get_db():
    async for session in finances_db.get_session():
        yield session

# Инициализация сервисов
category_service = CategoryService()
shop_service = ShopService()
metric_service = MetricService()
actual_value_service = ActualValueService()
plan_value_service = PlanValueService()
period_service = PeriodService()
image_service = ImageService()

# ------------ Эндпоинты для изображений ------------
@router.get("/images", response_model=List[Image])
async def get_images(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка изображений."""
    return await image_service.get_multi(session=session, skip=skip, limit=limit)

@router.post("/images", response_model=Image)
async def create_image(
    image_in: ImageCreate, 
    session: AsyncSession = Depends(get_db)
):
    """Создание нового изображения."""
    return await image_service.create(image_in, session=session)

@router.get("/images/{image_id}", response_model=Image)
async def get_image(
    image_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных изображения по ID."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return image

@router.put("/images/{image_id}", response_model=Image)
async def update_image(
    image_id: UUID, 
    image_in: ImageUpdate, 
    session: AsyncSession = Depends(get_db)
):
    """Обновление данных изображения."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return await image_service.update(id=image_id, obj_in=image_in, session=session)

@router.delete("/images/{image_id}", status_code=200)
async def delete_image(
    image_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Удаление изображения."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    result = await image_service.delete(id=image_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении изображения")
    return {"status": "success", "message": "Изображение успешно удалено"}

@router.get("/images/{image_id}/categories", response_model=List[Category])
async def get_categories_by_image(
    image_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение всех категорий, использующих данное изображение."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return await category_service.get_by_image_id(image_id=image_id, session=session)

@router.get("/images/unused", response_model=List[Image])
async def get_unused_images(
    session: AsyncSession = Depends(get_db)
):
    """Получение всех изображений, не используемых в категориях."""
    return await image_service.get_unused_images(session=session)

@router.post("/images/upload", response_model=Image)
async def upload_svg_image(
    name: Optional[str] = None,
    svg_file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db)
):
    """Загрузка SVG-изображения из файла."""
    if not svg_file.content_type.startswith("image/svg"):
        raise HTTPException(status_code=400, detail="Файл должен быть в формате SVG")
    
    # Чтение содержимого файла
    svg_data = await svg_file.read()
    
    # Конвертация в строку
    svg_data_str = svg_data.decode("utf-8")
    
    # Если имя не указано, используем имя файла
    if not name:
        name = svg_file.filename
    
    # Создание схемы изображения
    image_in = ImageCreate(name=name, svg_data=svg_data_str)
    
    # Сохранение изображения в БД
    return await image_service.create(image_in, session=session)

@router.get("/images/{image_id}/svg", response_class=HTMLResponse)
async def get_image_svg(
    image_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение SVG-данных изображения для отображения на веб-странице."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return HTMLResponse(content=image.svg_data, media_type="image/svg+xml")

@router.put("/images/{image_id}/upload", response_model=Image)
async def update_svg_image(
    image_id: UUID,
    name: Optional[str] = None,
    svg_file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db)
):
    """Обновление SVG-изображения из файла."""
    # Проверяем существование изображения
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    
    # Проверяем формат файла
    if not svg_file.content_type.startswith("image/svg"):
        raise HTTPException(status_code=400, detail="Файл должен быть в формате SVG")
    
    # Чтение содержимого файла
    svg_data = await svg_file.read()
    
    # Конвертация в строку
    svg_data_str = svg_data.decode("utf-8")
    
    # Подготавливаем данные для обновления
    update_data = {"svg_data": svg_data_str}
    if name:
        update_data["name"] = name
    
    # Создание схемы обновления
    image_update = ImageUpdate(**update_data)
    
    # Обновление изображения в БД
    return await image_service.update(id=image_id, obj_in=image_update, session=session)

# ------------ Эндпоинты для категорий ------------
@router.get("/categories", response_model=List[Category])
async def get_categories(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка категорий."""
    return await category_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/categories/with-images", response_model=List[CategoryWithRelations])
async def get_categories_with_images(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка категорий с их изображениями."""
    return await category_service.get_multi_with_relations(session=session, skip=skip, limit=limit)

@router.get("/categories/with-svg", response_model=List[dict])
async def get_categories_with_svg(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка категорий с встроенными SVG-изображениями для отображения."""
    categories = await category_service.get_multi_with_relations(session=session, skip=skip, limit=limit)
    
    result = []
    for category in categories:
        category_dict = category.model_dump()
        # Изображение уже должно быть загружено в результатах get_multi_with_relations
        result.append(category_dict)
    
    return result

@router.post("/categories", response_model=Category)
async def create_category(
    category_in: CategoryCreate, 
    session: AsyncSession = Depends(get_db)
):
    """Создание новой категории."""
    return await category_service.create(category_in, session=session)

@router.get("/categories/{category_id}", response_model=CategoryWithRelations)
async def get_category(
    category_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных категории по ID."""
    category = await category_service.get_with_relations(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return category

@router.get("/categories/{category_id}/with-svg", response_model=dict)
async def get_category_with_svg(
    category_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных категории с готовым для отображения SVG-изображением."""
    category = await category_service.get_with_relations(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    # Если у категории есть изображение, добавляем его SVG-данные в ответ
    result = category.model_dump()
    if result.get("image") and "svg_data" in result["image"]:
        # Изображение уже доступно в категории
        pass
    elif category.image_id:
        # Если изображение не загружено в результат, но ID есть, загружаем отдельно
        image = await image_service.get(id=category.image_id, session=session)
        if image:
            result["image"] = {
                "id": image.id,
                "name": image.name,
                "svg_data": image.svg_data
            }
    
    return result

@router.put("/categories/{category_id}", response_model=Category)
async def update_category(
    category_id: UUID, 
    category_in: CategoryUpdate, 
    session: AsyncSession = Depends(get_db)
):
    """Обновление данных категории."""
    category = await category_service.get(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return await category_service.update(id=category_id, obj_in=category_in, session=session)

@router.delete("/categories/{category_id}", status_code=200)
async def delete_category(
    category_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Удаление категории."""
    category = await category_service.get(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    result = await category_service.delete(id=category_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении категории")
    return {"status": "success", "message": "Категория успешно удалена"}

# ------------ Эндпоинты для магазинов ------------
@router.get("/shops", response_model=List[Shop])
async def get_shops(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка магазинов."""
    return await shop_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/shops/search", response_model=List[Shop])
async def search_shops(
    search: Optional[str] = None,
    status: Optional[bool] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """
    Поиск и фильтрация магазинов по имени, адресу, описанию и статусу.
    
    - search: поисковый запрос для фильтрации по имени, адресу и описанию
    - status: фильтр по статусу (True - активен, False - неактивен)
    """
    return await shop_service.search_shops(
        session=session, 
        search=search, 
        status=status, 
        skip=skip, 
        limit=limit
    )

@router.post("/shops", response_model=Shop)
async def create_shop(
    shop_in: ShopCreate, 
    session: AsyncSession = Depends(get_db)
):
    """Создание нового магазина."""
    return await shop_service.create(shop_in, session=session)

@router.get("/shops/{shop_id}", response_model=Shop)
async def get_shop(
    shop_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных магазина по ID."""
    shop = await shop_service.get(id=shop_id, session=session)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    return shop

@router.put("/shops/{shop_id}", response_model=Shop)
async def update_shop(
    shop_id: UUID, 
    shop_in: ShopUpdate, 
    session: AsyncSession = Depends(get_db)
):
    """Обновление данных магазина."""
    shop = await shop_service.get(id=shop_id, session=session)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    return await shop_service.update(id=shop_id, obj_in=shop_in, session=session)

@router.delete("/shops/{shop_id}", status_code=200)
async def delete_shop(
    shop_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Удаление магазина."""
    shop = await shop_service.get(id=shop_id, session=session)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    result = await shop_service.delete(id=shop_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении магазина")
    return {"status": "success", "message": "Магазин успешно удален"}

# ------------ Эндпоинты для метрик ------------
@router.get("/metrics", response_model=List[Metric])
async def get_metrics(
    category_id: Optional[UUID] = None,
    store_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка метрик."""
    if category_id or store_id:
        return await metric_service.get_metrics_by_filters(
            session=session, 
            category_id=category_id, 
            store_id=store_id,
            skip=skip, 
            limit=limit
        )
    return await metric_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/metrics/search", response_model=List[MetricWithCategory])
async def search_metrics(
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """
    Поиск и фильтрация метрик.
    
    - search: поисковый запрос для фильтрации по имени и единице измерения
    - category_id: фильтр по категории
    """
    return await metric_service.search_metrics(
        session=session, 
        search=search, 
        category_id=category_id,
        skip=skip,
        limit=limit
    )

@router.get("/metrics/with-data", response_model=List[dict])
async def get_metrics_with_data(
    shop_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    year: Optional[int] = None,
    session: AsyncSession = Depends(get_db)
):
    """
    Получение метрик со связанными данными (плановыми и фактическими значениями).
    Выполняет агрегацию данных, которая раньше делалась на стороне клиента.
    
    - shop_id: ID магазина для фильтрации данных
    - category_id: ID категории для фильтрации метрик
    - year: Год для фильтрации периодов
    """
    # Получаем текущий год, если не указан
    if not year:
        current_date = datetime.now()
        year = current_date.year
    
    # Получаем все метрики с фильтрацией по категории
    metrics = await metric_service.get_metrics_with_values_for_charts(
        session=session,
        shop_id=shop_id,
        category_id=category_id,
        year=year
    )
    
    return metrics

@router.post("/metrics", response_model=Metric)
async def create_metric(
    metric_in: MetricCreate, 
    session: AsyncSession = Depends(get_db)
):
    """Создание новой метрики с единицей измерения."""
    # Проверяем существование категории
    category = await category_service.get(id=metric_in.category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    return await metric_service.create(metric_in, session=session)

@router.get("/metrics/{metric_id}", response_model=MetricWithCategory)
async def get_metric(
    metric_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных метрики по ID с информацией о категории."""
    metric = await metric_service.get_with_relations(id=metric_id, session=session)
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    return metric

@router.put("/metrics/{metric_id}", response_model=Metric)
async def update_metric(
    metric_id: UUID, 
    metric_in: MetricUpdate, 
    session: AsyncSession = Depends(get_db)
):
    """Обновление данных метрики."""
    metric = await metric_service.get(id=metric_id, session=session)
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    return await metric_service.update(id=metric_id, obj_in=metric_in, session=session)

@router.delete("/metrics/{metric_id}", status_code=200)
async def delete_metric(
    metric_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Удаление метрики."""
    metric = await metric_service.get(id=metric_id, session=session)
    if not metric:
        raise HTTPException(status_code=404, detail="Метрика не найдена")
    result = await metric_service.delete(id=metric_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении метрики")
    return {"status": "success", "message": "Метрика успешно удалена"}

# ------------ Эндпоинты для периодов ------------
@router.get("/periods", response_model=List[Period])
async def get_periods(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    period_type: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка периодов с возможностью фильтрации."""
    if period_type:
        if period_type not in ["year", "quarter", "month"]:
            raise HTTPException(
                status_code=400,
                detail="Неправильный тип периода. Допустимые значения: year, quarter, month"
            )
        return await period_service.get_by_type(
            session=session,
            period_type=period_type,
            year=year,
            quarter=quarter,
            skip=skip,
            limit=limit
        )
    
    if year is not None:
        period = await period_service.get_by_year_quarter_month(
            year=year, quarter=quarter, month=month, session=session
        )
        return [period] if period else []
    return await period_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/periods/grouped", response_model=Dict[str, List[Period]])
async def get_periods_grouped(
    year: Optional[int] = None,
    session: AsyncSession = Depends(get_db)
):
    """
    Получение периодов, сгруппированных по типу (год, квартал, месяц).
    
    Возвращает словарь с ключами "years", "quarters", "months" и соответствующими списками периодов.
    """
    return await period_service.get_periods_grouped_by_type(session=session, year=year)

@router.post("/periods", response_model=Period)
async def create_period(
    period_in: PeriodCreate, 
    session: AsyncSession = Depends(get_db)
):
    """Создание нового периода."""
    return await period_service.create(period_in, session=session)

@router.get("/periods/{period_id}", response_model=Period)
async def get_period(
    period_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных периода по ID."""
    period = await period_service.get(id=period_id, session=session)
    if not period:
        raise HTTPException(status_code=404, detail="Период не найден")
    return period

@router.put("/periods/{period_id}", response_model=Period)
async def update_period(
    period_id: UUID, 
    period_in: PeriodUpdate, 
    session: AsyncSession = Depends(get_db)
):
    """Обновление данных периода."""
    period = await period_service.get(id=period_id, session=session)
    if not period:
        raise HTTPException(status_code=404, detail="Период не найден")
    return await period_service.update(id=period_id, obj_in=period_in, session=session)

@router.delete("/periods/{period_id}", status_code=200)
async def delete_period(
    period_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Удаление периода."""
    period = await period_service.get(id=period_id, session=session)
    if not period:
        raise HTTPException(status_code=404, detail="Период не найден")
    result = await period_service.delete(id=period_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении периода")
    return {"status": "success", "message": "Период успешно удален"}

# ------------ Эндпоинты для фактических значений ------------
@router.get("/actual-values", response_model=List[ActualValue])
async def get_actual_values(
    metric_id: Optional[UUID] = None,
    shop_id: Optional[UUID] = None,
    period_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка фактических значений с возможностью фильтрации."""
    if metric_id:
        return await actual_value_service.get_by_metric(metric_id=metric_id, session=session)
    if shop_id:
        return await actual_value_service.get_by_shop(shop_id=shop_id, session=session)
    if period_id:
        return await actual_value_service.get_by_period(period_id=period_id, session=session)
    return await actual_value_service.get_multi(session=session, skip=skip, limit=limit)

@router.post("/actual-values", response_model=ActualValue)
async def create_actual_value(
    actual_value_in: ActualValueCreate, 
    session: AsyncSession = Depends(get_db)
):
    """Создание нового фактического значения."""
    return await actual_value_service.create(actual_value_in, session=session)

@router.get("/actual-values/{actual_value_id}", response_model=ActualValueWithRelations)
async def get_actual_value(
    actual_value_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных фактического значения по ID."""
    actual_value = await actual_value_service.get_with_relations(id=actual_value_id, session=session)
    if not actual_value:
        raise HTTPException(status_code=404, detail="Фактическое значение не найдено")
    return actual_value

@router.put("/actual-values/{actual_value_id}", response_model=ActualValue)
async def update_actual_value(
    actual_value_id: UUID, 
    actual_value_in: ActualValueUpdate, 
    session: AsyncSession = Depends(get_db)
):
    """Обновление данных фактического значения."""
    actual_value = await actual_value_service.get(id=actual_value_id, session=session)
    if not actual_value:
        raise HTTPException(status_code=404, detail="Фактическое значение не найдено")
    return await actual_value_service.update(id=actual_value_id, obj_in=actual_value_in, session=session)

@router.delete("/actual-values/{actual_value_id}", status_code=200)
async def delete_actual_value(
    actual_value_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Удаление фактического значения."""
    actual_value = await actual_value_service.get(id=actual_value_id, session=session)
    if not actual_value:
        raise HTTPException(status_code=404, detail="Фактическое значение не найдено")
    result = await actual_value_service.delete(id=actual_value_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении фактического значения")
    return {"status": "success", "message": "Фактическое значение успешно удалено"}

# ------------ Эндпоинты для плановых значений ------------
@router.get("/plan-values", response_model=List[PlanValue])
async def get_plan_values(
    metric_id: Optional[UUID] = None,
    shop_id: Optional[UUID] = None,
    period_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(get_db)
):
    """Получение списка плановых значений с возможностью фильтрации."""
    if metric_id:
        return await plan_value_service.get_by_metric(metric_id=metric_id, session=session)
    if shop_id:
        return await plan_value_service.get_by_shop(shop_id=shop_id, session=session)
    if period_id:
        return await plan_value_service.get_by_period(period_id=period_id, session=session)
    return await plan_value_service.get_multi(session=session, skip=skip, limit=limit)

@router.post("/plan-values", response_model=PlanValue)
async def create_plan_value(
    plan_value_in: PlanValueCreate, 
    session: AsyncSession = Depends(get_db)
):
    """Создание нового планового значения."""
    return await plan_value_service.create(plan_value_in, session=session)

@router.get("/plan-values/{plan_value_id}", response_model=PlanValueWithRelations)
async def get_plan_value(
    plan_value_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Получение данных планового значения по ID."""
    plan_value = await plan_value_service.get_with_relations(id=plan_value_id, session=session)
    if not plan_value:
        raise HTTPException(status_code=404, detail="Плановое значение не найдено")
    return plan_value

@router.put("/plan-values/{plan_value_id}", response_model=PlanValue)
async def update_plan_value(
    plan_value_id: UUID, 
    plan_value_in: PlanValueUpdate, 
    session: AsyncSession = Depends(get_db)
):
    """Обновление данных планового значения."""
    plan_value = await plan_value_service.get(id=plan_value_id, session=session)
    if not plan_value:
        raise HTTPException(status_code=404, detail="Плановое значение не найдено")
    return await plan_value_service.update(id=plan_value_id, obj_in=plan_value_in, session=session)

@router.delete("/plan-values/{plan_value_id}", status_code=200)
async def delete_plan_value(
    plan_value_id: UUID, 
    session: AsyncSession = Depends(get_db)
):
    """Удаление планового значения."""
    plan_value = await plan_value_service.get(id=plan_value_id, session=session)
    if not plan_value:
        raise HTTPException(status_code=404, detail="Плановое значение не найдено")
    result = await plan_value_service.delete(id=plan_value_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении планового значения")
    return {"status": "success", "message": "Плановое значение успешно удалено"}

@router.post("/plan-values/distribute-yearly", response_model=List[PlanValue])
async def distribute_yearly_plan(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    yearly_value: Decimal,
    session: AsyncSession = Depends(get_db)
):
    """Создание годового плана с автоматическим распределением на кварталы и месяцы."""
    try:
        return await plan_value_service.distribute_yearly_plan(
            metric_id=metric_id,
            shop_id=shop_id,
            year=year,
            yearly_value=yearly_value,
            session=session
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при создании распределенного плана: {str(e)}"
        )

@router.post("/plan-values/recalculate-with-actual", response_model=List[PlanValue])
async def recalculate_plan_with_actual(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    actual_month: int,
    actual_value: Decimal,
    session: AsyncSession = Depends(get_db)
):
    """
    Пересчет годового плана с учетом фактического значения.
    
    После ввода фактического значения, которое отличается от планового,
    годовой план корректируется и оставшаяся разница равномерно распределяется
    по оставшимся месяцам года.
    """
    try:
        return await plan_value_service.recalculate_plan_with_actual(
            metric_id=metric_id,
            shop_id=shop_id,
            year=year,
            actual_month=actual_month,
            actual_value=actual_value,
            session=session
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Ошибка при пересчете плана: {str(e)}"
        )

@router.get("/budget-statistics", response_model=Dict[str, Any])
async def get_budget_statistics(
    shop_id: Optional[UUID] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    session: AsyncSession = Depends(get_db)
):
    """
    Получение бюджетной статистики для панели управления.
    
    Возвращает статистические данные о выполнении бюджета за указанный период:
    - total_plan: Сумма плановых значений
    - total_actual: Сумма фактических значений
    - percentage: Процент выполнения плана
    - status: Статус бюджета (ahead|on_track|behind)
    - remaining_budget: Оставшийся бюджет
    
    Если год или месяц не указаны, используются текущие.
    """
    return await metric_service.calculate_budget_statistics(
        session=session,
        shop_id=shop_id,
        year=year,
        month=month
        ) 
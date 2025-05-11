from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import Image, ImageCreate, ImageUpdate
from src.api.v1.endpoints.finance.utils import finances_db, image_service, category_service

router = APIRouter()

@router.get("", response_model=List[Image])
async def get_images(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка изображений."""
    return await image_service.get_multi(session=session, skip=skip, limit=limit)

@router.post("", response_model=Image)
async def create_image(
    image_in: ImageCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового изображения."""
    return await image_service.create(image_in, session=session)

@router.get("/{image_id}", response_model=Image)
async def get_image(
    image_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение данных изображения по ID."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return image

@router.put("/{image_id}", response_model=Image)
async def update_image(
    image_id: UUID, 
    image_in: ImageUpdate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление данных изображения."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return await image_service.update(id=image_id, obj_in=image_in, session=session)

@router.delete("/{image_id}", status_code=200)
async def delete_image(
    image_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление изображения."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    result = await image_service.delete(id=image_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении изображения")
    return {"status": "success", "message": "Изображение успешно удалено"}

@router.get("/{image_id}/categories", response_model=List[Image])
async def get_categories_by_image(
    image_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение всех категорий, использующих данное изображение."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return await category_service.get_by_image_id(image_id=image_id, session=session)

@router.get("/unused", response_model=List[Image])
async def get_unused_images(
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение всех изображений, не используемых в категориях."""
    return await image_service.get_unused_images(session=session)

@router.post("/upload", response_model=Image)
async def upload_svg_image(
    name: Optional[str] = None,
    svg_file: UploadFile = File(...),
    session: AsyncSession = Depends(finances_db.get_session)
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

@router.get("/{image_id}/svg", response_class=HTMLResponse)
async def get_image_svg(
    image_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение SVG-данных изображения для отображения на веб-странице."""
    image = await image_service.get(id=image_id, session=session)
    if not image:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return HTMLResponse(content=image.svg_data, media_type="image/svg+xml")

@router.put("/{image_id}/upload", response_model=Image)
async def update_svg_image(
    image_id: UUID,
    name: Optional[str] = None,
    svg_file: UploadFile = File(...),
    session: AsyncSession = Depends(finances_db.get_session)
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

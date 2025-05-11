from typing import List, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import Category, CategoryCreate, CategoryUpdate, CategoryWithRelations
from src.api.v1.endpoints.finance.utils import finances_db, category_service, image_service

router = APIRouter()

@router.get("", response_model=List[Category])
async def get_categories(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка категорий."""
    return await category_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/with-images", response_model=List[CategoryWithRelations])
async def get_categories_with_images(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка категорий с изображениями."""
    return await category_service.get_multi_with_relations(session=session, skip=skip, limit=limit)

@router.get("/with-svg", response_model=List[dict])
async def get_categories_with_svg(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка категорий с SVG-данными."""
    categories = await category_service.get_multi_with_relations(session=session, skip=skip, limit=limit)
    
    # Преобразуем результат для включения SVG-данных
    result = []
    for category in categories:
        category_dict = category.dict()
        if category.image:
            category_dict["svg_data"] = category.image.svg_data
        result.append(category_dict)
        
    return result

@router.post("", response_model=Category)
async def create_category(
    category_in: CategoryCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание новой категории."""
    try:
        print(f"Создаем категорию с данными: {category_in.dict()}")
        category = await category_service.create(category_in, session=session)
        print(f"Категория создана: {category.dict()}")
        return category
    except Exception as e:
        print(f"Ошибка при создании категории: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при создании категории: {str(e)}")

@router.get("/{category_id}", response_model=CategoryWithRelations)
async def get_category(
    category_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение данных категории по ID."""
    category = await category_service.get_with_relations(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return category

@router.get("/{category_id}/with-svg", response_model=dict)
async def get_category_with_svg(
    category_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение данных категории с SVG-данными по ID."""
    category = await category_service.get_with_relations(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    # Преобразуем результат для включения SVG-данных
    category_dict = category.dict()
    if category.image:
        category_dict["svg_data"] = category.image.svg_data
        
    return category_dict

@router.put("/{category_id}", response_model=Category)
async def update_category(
    category_id: UUID, 
    category_in: CategoryUpdate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление данных категории."""
    category = await category_service.get(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    try:
        print(f"Обновляем категорию {category_id} с данными: {category_in.dict()}")
        updated_category = await category_service.update(id=category_id, obj_in=category_in, session=session)
        print(f"Категория обновлена: {updated_category.dict()}")
        return updated_category
    except Exception as e:
        print(f"Ошибка при обновлении категории: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении категории: {str(e)}")

@router.delete("/{category_id}", status_code=200)
async def delete_category(
    category_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление категории."""
    category = await category_service.get(id=category_id, session=session)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    result = await category_service.delete(id=category_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении категории")
    return {"status": "success", "message": "Категория успешно удалена"} 

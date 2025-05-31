from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import Shop, ShopCreate, ShopUpdate
from src.api.v1.endpoints.finance.utils import finances_db, shop_service

router = APIRouter()

@router.get("", response_model=List[Shop])
async def get_shops(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка магазинов."""
    return await shop_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/search", response_model=List[Shop])
async def search_shops(
    search: Optional[str] = None,
    status: Optional[bool] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Поиск магазинов по фильтрам.
    
    Args:
        search: Поисковый запрос для фильтрации по имени
        status: Статус активности магазина
        skip: Смещение для пагинации
        limit: Ограничение для пагинации
    """
    return await shop_service.search_shops(
        session=session,
        search=search,
        status=status,
        skip=skip,
        limit=limit
    )

@router.post("", response_model=Shop)
async def create_shop(
    shop_in: ShopCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового магазина."""
    return await shop_service.create(shop_in, session=session)

@router.get("/{shop_id}", response_model=Shop)
async def get_shop(
    shop_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение данных магазина по ID."""
    shop = await shop_service.get(id=shop_id, session=session)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    return shop

@router.put("/{shop_id}", response_model=Shop)
async def update_shop(
    shop_id: UUID, 
    shop_in: ShopUpdate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление данных магазина."""
    shop = await shop_service.get(id=shop_id, session=session)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    return await shop_service.update(id=shop_id, obj_in=shop_in, session=session)

@router.delete("/{shop_id}", status_code=200)
async def delete_shop(
    shop_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление магазина."""
    shop = await shop_service.get(id=shop_id, session=session)
    if not shop:
        raise HTTPException(status_code=404, detail="Магазин не найден")
    result = await shop_service.delete(id=shop_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении магазина")
    return {"status": "success", "message": "Магазин успешно удален"} 
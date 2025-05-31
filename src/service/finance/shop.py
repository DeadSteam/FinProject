from typing import List, Optional

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance import Shop
from src.scheme.finance import Shop as ShopSchema, ShopCreate, ShopUpdate
from src.service.base import BaseService


class ShopService(BaseService[Shop, ShopSchema, ShopCreate, ShopUpdate]):
    """Сервис для работы с магазинами."""
    
    def __init__(self):
        super().__init__(finances_db, Shop, ShopSchema)
    
    async def get_by_name(self, name: str, session: AsyncSession) -> Optional[ShopSchema]:
        """Получение магазина по имени."""
        query = select(self.model).where(self.model.name == name)
        result = await session.execute(query)
        shop = result.scalars().first()
        
        if not shop:
            return None
        
        return TypeAdapter(self.schema).validate_python(shop.__dict__)
    
    async def search_shops(
        self,
        session: AsyncSession,
        search: Optional[str] = None,
        status: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ShopSchema]:
        """
        Поиск магазинов по параметрам.
        
        Args:
            session: Сессия БД
            search: Поисковый запрос для фильтрации по имени и описанию
            status: Статус магазина (активен/неактивен)
            skip: Смещение для пагинации
            limit: Ограничение для пагинации
            
        Returns:
            Список магазинов, соответствующих критериям поиска
        """
        conditions = []
        
        # Фильтр по поисковому запросу
        if search:
            conditions.append(or_(
                self.model.name.ilike(f"%{search}%"),
                self.model.description.ilike(f"%{search}%"),
                self.model.address.ilike(f"%{search}%")
            ))
        
        # Фильтр по статусу
        if status is not None:
            conditions.append(self.model.status == status)

        # Формируем запрос с учетом всех фильтров
        if conditions:
            query = select(self.model).where(and_(*conditions))
        else:
            query = select(self.model)
        
        # Добавление пагинации
        query = query.offset(skip).limit(limit)
        
        # Выполнение запроса
        result = await session.execute(query)
        shops = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(shop.__dict__) for shop in shops]
    
    async def get_by_id(self, id: str, session: AsyncSession) -> Optional[Shop]:
        """
        Получение магазина по ID.
        
        Args:
            id: ID магазина
            session: Сессия БД
            
        Returns:
            Магазин или None, если магазин не найден
        """
        query = select(self.model).where(self.model.id == id)
        result = await session.execute(query)
        return result.scalar_one_or_none() 
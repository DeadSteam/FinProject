from typing import AsyncGenerator, Dict, Any, Type, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, insert
from sqlalchemy.sql import Select

from src.repository.db_helper import users_db_helper, finances_db_helper
from src.model.base import Base

T = TypeVar('T', bound=Base)


class Database:
    """Базовый класс для работы с базой данных."""
    
    def __init__(self, db_helper):
        self.db_helper = db_helper
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Получение сессии для работы с базой данных."""
        async with self.db_helper.session_factory() as session:
            yield session
    
    async def get_by_id(self, model: Type[T], id: Any, session: AsyncSession) -> T:
        """Получение объекта по идентификатору."""
        result = await session.execute(select(model).where(model.id == id))
        return result.scalar_one_or_none()
    
    async def get_all(self, model: Type[T], session: AsyncSession) -> list[T]:
        """Получение всех объектов указанной модели."""
        result = await session.execute(select(model))
        return list(result.scalars().all())
    
    async def get_by_query(self, query: Select, session: AsyncSession) -> list[Any]:
        """Получение объектов по запросу."""
        result = await session.execute(query)
        return list(result.scalars().all())
    
    async def create(self, model: Type[T], data: Dict[str, Any], session: AsyncSession) -> T:
        """Создание нового объекта."""
        stmt = insert(model).values(**data).returning(model)
        result = await session.execute(stmt)
        await session.commit()
        return result.scalar_one()
    
    async def update(self, model: Type[T], id: Any, data: Dict[str, Any], session: AsyncSession) -> T:
        """Обновление существующего объекта."""
        stmt = update(model).where(model.id == id).values(**data).returning(model)
        result = await session.execute(stmt)
        await session.commit()
        return result.scalar_one()
    
    async def delete(self, model: Type[T], id: Any, session: AsyncSession) -> bool:
        """Удаление объекта по идентификатору."""
        stmt = delete(model).where(model.id == id)
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount > 0


# Создаем экземпляры для каждой базы данных
users_db = Database(users_db_helper)
finances_db = Database(finances_db_helper) 
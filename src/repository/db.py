from typing import AsyncGenerator, Dict, Any, Type, TypeVar, Optional, List
import json
import hashlib
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, insert
from sqlalchemy.sql import Select

from src.repository.db_helper import users_db_helper, finances_db_helper, redis_helper
from src.model.base import Base

T = TypeVar('T', bound=Base)


class Database:
    """Базовый класс для работы с базой данных с поддержкой кэширования в Redis."""
    
    def __init__(self, db_helper):
        self.db_helper = db_helper
        self.redis = redis_helper
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Получение сессии для работы с базой данных."""
        async with self.db_helper.session_factory() as session:
            yield session
    
    def _generate_cache_key(self, model: Type[T], id: Any = None, query_str: str = None) -> str:
        """Генерация ключа для кэша на основе модели и параметров запроса."""
        if id is not None:
            # Конвертируем UUID в строку, если это UUID
            id_str = str(id) if isinstance(id, uuid.UUID) else str(id)
            key = f"{model.__tablename__}:id:{id_str}"
        elif query_str is not None:
            # Используем хеш для длинных запросов
            query_hash = hashlib.md5(query_str.encode()).hexdigest()
            key = f"{model.__tablename__}:query:{query_hash}"
        else:
            key = f"{model.__tablename__}:all"
        return key
    
    async def get_by_id(self, model: Type[T], id: Any, session: AsyncSession) -> Optional[T]:
        """Получение объекта по идентификатору с проверкой кэша."""
        cache_key = self._generate_cache_key(model, id=id)
        
        # Проверяем наличие в кэше
        cached_data = await self.redis.get(cache_key)
        if cached_data:
            # Если данные найдены в кэше, создаем объект модели из кэша
            return model(**cached_data)
        
        # Если кэш пуст, получаем из БД
        result = await session.execute(select(model).where(model.id == id))
        obj = result.scalar_one_or_none()
        
        # Если нашли объект, сохраняем в кэш
        if obj:
            # Преобразуем объект в словарь для кэширования
            obj_dict = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
            await self.redis.set(cache_key, obj_dict)
        
        return obj
    
    async def get_all(self, model: Type[T], session: AsyncSession) -> List[T]:
        """Получение всех объектов указанной модели с проверкой кэша."""
        cache_key = self._generate_cache_key(model)
        
        # Проверяем наличие в кэше
        cached_data = await self.redis.get(cache_key)
        if cached_data:
            # Если данные найдены в кэше, создаем список объектов из кэша
            return [model(**item) for item in cached_data]
        
        # Если кэш пуст, получаем из БД
        result = await session.execute(select(model))
        objects = list(result.scalars().all())
        
        # Сохраняем в кэш
        if objects:
            # Преобразуем объекты в список словарей для кэширования
            objects_dict = [
                {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
                for obj in objects
            ]
            await self.redis.set(cache_key, objects_dict)
        
        return objects
    
    async def get_by_query(self, query: Select, session: AsyncSession) -> List[Any]:
        """Получение объектов по запросу с проверкой кэша."""
        # Получаем модель из запроса
        model = query.column_descriptions[0]['entity']
        
        # Преобразуем запрос в строку для создания ключа кэша
        query_str = str(query.compile(compile_kwargs={"literal_binds": True}))
        cache_key = self._generate_cache_key(model, query_str=query_str)
        
        # Проверяем наличие в кэше
        cached_data = await self.redis.get(cache_key)
        if cached_data:
            # Если данные найдены в кэше, создаем список объектов из кэша
            return [model(**item) for item in cached_data]
        
        # Если кэш пуст, получаем из БД
        result = await session.execute(query)
        objects = list(result.scalars().all())
        
        # Сохраняем в кэш
        if objects:
            # Преобразуем объекты в список словарей для кэширования
            objects_dict = [
                {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
                for obj in objects
            ]
            await self.redis.set(cache_key, objects_dict)
        
        return objects
    
    async def create(self, model: Type[T], data: Dict[str, Any], session: AsyncSession) -> T:
        """Создание нового объекта с инвалидацией кэша."""
        stmt = insert(model).values(**data).returning(model)
        result = await session.execute(stmt)
        await session.commit()
        new_obj = result.scalar_one()
        
        # Инвалидируем кэш для всех объектов данной модели
        cache_key_all = self._generate_cache_key(model)
        await self.redis.delete(cache_key_all)
        
        # Сохраняем новый объект в кэш по ID
        obj_dict = {c.name: getattr(new_obj, c.name) for c in new_obj.__table__.columns}
        cache_key = self._generate_cache_key(model, id=new_obj.id)
        await self.redis.set(cache_key, obj_dict)
        
        return new_obj
    
    async def update(self, model: Type[T], id: Any, data: Dict[str, Any], session: AsyncSession) -> T:
        """Обновление существующего объекта с инвалидацией кэша."""
        stmt = update(model).where(model.id == id).values(**data).returning(model)
        result = await session.execute(stmt)
        await session.commit()
        updated_obj = result.scalar_one()
        
        # Инвалидируем кэш для всех объектов данной модели и для объекта по ID
        cache_key_all = self._generate_cache_key(model)
        cache_key_id = self._generate_cache_key(model, id=id)
        await self.redis.delete(cache_key_all)
        
        # Сохраняем обновленный объект в кэш
        obj_dict = {c.name: getattr(updated_obj, c.name) for c in updated_obj.__table__.columns}
        await self.redis.set(cache_key_id, obj_dict)
        
        return updated_obj
    
    async def delete(self, model: Type[T], id: Any, session: AsyncSession) -> bool:
        """Удаление объекта по идентификатору с инвалидацией кэша."""
        stmt = delete(model).where(model.id == id)
        result = await session.execute(stmt)
        await session.commit()
        success = result.rowcount > 0
        
        if success:
            # Инвалидируем кэш для всех объектов данной модели и для объекта по ID
            cache_key_all = self._generate_cache_key(model)
            cache_key_id = self._generate_cache_key(model, id=id)
            await self.redis.delete(cache_key_all)
            await self.redis.delete(cache_key_id)
        
        return success


# Создаем экземпляры для каждой базы данных
users_db = Database(users_db_helper)
finances_db = Database(finances_db_helper) 
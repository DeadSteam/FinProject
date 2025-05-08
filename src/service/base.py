import uuid
from typing import TypeVar, Generic, Type, List, Optional, Dict, Any, Union

from pydantic import BaseModel, TypeAdapter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from src.repository.db import Database
from src.model.base import Base

T = TypeVar('T', bound=Base)
SchemaType = TypeVar('SchemaType', bound=BaseModel)
CreateSchemaType = TypeVar('CreateSchemaType', bound=BaseModel)
UpdateSchemaType = TypeVar('UpdateSchemaType', bound=BaseModel)


class BaseService(Generic[T, SchemaType, CreateSchemaType, UpdateSchemaType]):
    """Базовый сервис для работы с моделями."""
    
    def __init__(self, db: Database, model: Type[T], schema: Type[SchemaType]):
        """Инициализация сервиса.
        
        Args:
            db: Экземпляр базы данных
            model: Класс модели SQLAlchemy
            schema: Класс схемы Pydantic для возвращаемых данных
        """
        self.db = db
        self.model = model
        self.schema = schema
    
    async def get(self, id: uuid.UUID, session: AsyncSession) -> Optional[SchemaType]:
        """Получение объекта по идентификатору."""
        db_obj = await self.db.get_by_id(self.model, id, session)
        if not db_obj:
            return None
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def get_multi(self, session: AsyncSession, skip: int = 0, limit: int = 100) -> List[SchemaType]:
        """Получение списка объектов с пагинацией."""
        query = select(self.model).offset(skip).limit(limit)
        db_objs = await self.db.get_by_query(query, session)
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_all(self, session: AsyncSession) -> List[SchemaType]:
        """Получение всех объектов."""
        db_objs = await self.db.get_all(self.model, session)
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_query(self, query: Select, session: AsyncSession) -> List[SchemaType]:
        """Получение объектов по запросу."""
        db_objs = await self.db.get_by_query(query, session)
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def create(self, obj_in: CreateSchemaType, session: AsyncSession) -> SchemaType:
        """Создание нового объекта."""
        obj_data = obj_in.model_dump(exclude_unset=True)
        db_obj = await self.db.create(self.model, obj_data, session)
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def update(self, id: uuid.UUID, obj_in: Union[UpdateSchemaType, Dict[str, Any]], session: AsyncSession) -> Optional[SchemaType]:
        """Обновление существующего объекта."""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        # Проверяем существование объекта
        db_obj = await self.db.get_by_id(self.model, id, session)
        if not db_obj:
            return None
        
        # Обновляем объект
        updated_obj = await self.db.update(self.model, id, update_data, session)
        return TypeAdapter(self.schema).validate_python(updated_obj.__dict__)
    
    async def delete(self, id: uuid.UUID, session: AsyncSession) -> bool:
        """Удаление объекта по идентификатору."""
        # Проверяем существование объекта
        db_obj = await self.db.get_by_id(self.model, id, session)
        if not db_obj:
            return False
        
        # Удаляем объект
        return await self.db.delete(self.model, id, session)
    
    async def exists(self, id: uuid.UUID, session: AsyncSession) -> bool:
        """Проверка существования объекта по идентификатору."""
        query = select(1).select_from(self.model).where(self.model.id == id).limit(1)
        result = await session.execute(query)
        return result.scalar_one_or_none() is not None 
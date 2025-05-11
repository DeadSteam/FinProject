import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance import Category
from src.scheme.finance import (
    Category as CategorySchema, 
    CategoryWithRelations, 
    CategoryCreate, 
    CategoryUpdate
)
from src.service.base import BaseService


class CategoryService(BaseService[Category, CategorySchema, CategoryCreate, CategoryUpdate]):
    """Сервис для работы с категориями."""
    
    def __init__(self):
        super().__init__(finances_db, Category, CategorySchema)
    
    async def get_by_image_id(self, image_id: uuid.UUID, session: AsyncSession) -> List[CategorySchema]:
        """Получение всех категорий, использующих указанное изображение."""
        query = select(self.model).where(self.model.image_id == image_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_multi_with_relations(
        self, session: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[CategoryWithRelations]:
        """Получение списка категорий с изображениями."""
        query = (
            select(self.model)
            .options(selectinload(self.model.image))
            .offset(skip)
            .limit(limit)
        )
        
        result = await session.execute(query)
        categories = result.scalars().all()
        
        result_list = []
        for category in categories:
            # Создаем базовые данные категории
            category_data = {
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "image_id": category.image_id,
                "status": category.status
            }
            
            # Добавляем данные изображения, если оно есть
            if category.image:
                image_data = {
                    "id": category.image.id,
                    "name": category.image.name,
                    "svg_data": category.image.svg_data
                }
                category_data["image"] = image_data
            else:
                category_data["image"] = None
            
            result_list.append(CategoryWithRelations(**category_data))
        
        return result_list
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[CategoryWithRelations]:
        """Получение категории с изображением по ID."""
        query = (
            select(self.model)
            .options(selectinload(self.model.image))
            .where(self.model.id == id)
        )
        
        result = await session.execute(query)
        category = result.scalars().first()
        
        if not category:
            return None
        
        # Создаем базовые данные категории
        category_data = {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "image_id": category.image_id,
            "status": category.status
        }
        
        # Добавляем данные изображения, если оно есть
        if category.image:
            image_data = {
                "id": category.image.id,
                "name": category.image.name,
                "svg_data": category.image.svg_data
            }
            category_data["image"] = image_data
        else:
            category_data["image"] = None
        
        return CategoryWithRelations(**category_data)
    
    async def get_by_name(self, name: str, session: AsyncSession) -> Optional[CategorySchema]:
        """Получение категории по имени."""
        query = select(self.model).where(self.model.name == name)
        result = await session.execute(query)
        category = result.scalars().first()
        
        if not category:
            return None
        
        return TypeAdapter(self.schema).validate_python(category.__dict__) 
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance import Image, Category
from src.scheme.finance import Image as ImageSchema, ImageCreate, ImageUpdate
from src.service.base import BaseService


class ImageService(BaseService[Image, ImageSchema, ImageCreate, ImageUpdate]):
    """Сервис для работы с изображениями."""
    
    def __init__(self):
        super().__init__(finances_db, Image, ImageSchema)
    
    async def get_unused_images(self, session: AsyncSession) -> List[ImageSchema]:
        """Получение изображений, не используемых в категориях."""
        # Подзапрос для получения image_id, используемых в категориях
        subquery = select(Category.image_id).where(Category.image_id != None).distinct()
        
        # Основной запрос для получения изображений, ID которых не входят в подзапрос
        query = select(self.model).where(self.model.id.not_in(subquery))
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs] 
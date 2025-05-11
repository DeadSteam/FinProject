import uuid
from typing import Optional, List, Dict, Any
from decimal import Decimal

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance.actual_value import ActualValue
from src.scheme.finance.actual_value import (
    ActualValue as ActualValueSchema, 
    ActualValueWithRelations, 
    ActualValueCreate, 
    ActualValueUpdate
)
from src.service.base import BaseService


class ActualValueService(BaseService[ActualValue, ActualValueSchema, ActualValueCreate, ActualValueUpdate]):
    """Сервис для работы с фактическими значениями."""
    
    def __init__(self):
        super().__init__(finances_db, ActualValue, ActualValueSchema)
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[ActualValueWithRelations]:
        """Получение фактического значения с отношениями."""
        query = (
            select(self.model)
            .options(
                selectinload(self.model.metric),
                selectinload(self.model.shop),
                selectinload(self.model.period)
            )
            .where(self.model.id == id)
        )
        result = await session.execute(query)
        db_obj = result.scalar_one_or_none()
        
        if not db_obj:
            return None
            
        # Преобразуем объект модели в словарь
        obj_dict = db_obj.__dict__.copy()
        
        # Добавляем данные из отношений
        if db_obj.metric:
            obj_dict["metric"] = db_obj.metric.__dict__
        if db_obj.shop:
            obj_dict["shop"] = db_obj.shop.__dict__
        if db_obj.period:
            obj_dict["period"] = db_obj.period.__dict__
            
        return TypeAdapter(ActualValueWithRelations).validate_python(obj_dict)
    
    async def get_by_metric_shop_period(
        self, metric_id: uuid.UUID, shop_id: uuid.UUID, period_id: uuid.UUID, session: AsyncSession
    ) -> Optional[ActualValueSchema]:
        """Получение фактического значения по метрике, магазину и периоду."""
        # Используем функцию get_by_params для получения объекта модели
        db_obj = await self.get_by_params(metric_id, shop_id, period_id, session)
        
        if not db_obj:
            return None
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def get_by_period(self, period_id: uuid.UUID, session: AsyncSession) -> List[ActualValueSchema]:
        """Получение всех фактических значений для периода."""
        query = select(self.model).where(self.model.period_id == period_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_shop(self, shop_id: uuid.UUID, session: AsyncSession) -> List[ActualValueSchema]:
        """Получение всех фактических значений для магазина."""
        query = select(self.model).where(self.model.shop_id == shop_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_metric(self, metric_id: uuid.UUID, session: AsyncSession) -> List[ActualValueSchema]:
        """Получение всех фактических значений для метрики."""
        query = select(self.model).where(self.model.metric_id == metric_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_params(
        self, metric_id: uuid.UUID, shop_id: uuid.UUID, period_id: uuid.UUID, session: AsyncSession
    ) -> Optional[ActualValue]:
        """Получение фактического значения по параметрам."""
        query = select(self.model).where(
            and_(
                self.model.metric_id == metric_id,
                self.model.shop_id == shop_id,
                self.model.period_id == period_id
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_params_list(
        self, 
        metric_id: uuid.UUID, 
        period_id: uuid.UUID, 
        session: AsyncSession,
        shop_id: Optional[uuid.UUID] = None
    ) -> List[ActualValueSchema]:
        """
        Получение списка фактических значений по параметрам.
        
        Args:
            metric_id: ID метрики
            period_id: ID периода
            session: Сессия БД
            shop_id: ID магазина (опционально)
            
        Returns:
            Список фактических значений, подходящих под условия
        """
        conditions = [
            self.model.metric_id == metric_id,
            self.model.period_id == period_id
        ]
        
        if shop_id is not None:
            conditions.append(self.model.shop_id == shop_id)
        
        query = select(self.model).where(and_(*conditions))
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs] 
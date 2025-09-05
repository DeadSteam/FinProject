from typing import List
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from src.model.finance.plan_value import PlanValue as PlanValueModel
from src.model.finance.period import Period as PeriodModel
from src.model.finance.metric import Metric as MetricModel
from src.model.finance.shop import Shop as ShopModel
from src.repository import finances_db

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_yearly_plans(
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка всех годовых планов."""
    try:
        # Получаем плановые значения для годовых периодов (без quarter и month)
        stmt = select(PlanValueModel).join(
            PeriodModel, PlanValueModel.period_id == PeriodModel.id
        ).join(
            MetricModel, PlanValueModel.metric_id == MetricModel.id
        ).join(
            ShopModel, PlanValueModel.shop_id == ShopModel.id
        ).where(
            PeriodModel.quarter.is_(None),
            PeriodModel.month.is_(None)
        ).options(
            selectinload(PlanValueModel.period),
            selectinload(PlanValueModel.metric),
            selectinload(PlanValueModel.shop)
        ).order_by(desc(PeriodModel.year))
        
        result = await session.execute(stmt)
        plan_values = result.scalars().all()
        
        yearly_plans = []
        for plan in plan_values:
            yearly_plans.append({
                'id': plan.id,
                'year_id': plan.period.id,
                'metric_id': plan.metric.id,
                'shop_id': plan.shop.id,
                'plan_value': float(plan.value) if plan.value else 0.0,
                'metric_name': plan.metric.name,
                'shop_name': plan.shop.name,
                'year': plan.period.year
            })
        
        return yearly_plans
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении годовых планов: {str(e)}"
        )

@router.post("/", response_model=dict)
async def create_yearly_plan(
    plan_data: dict,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового годового плана."""
    try:
        year_id = plan_data.get('year_id')
        metric_id = plan_data.get('metric_id')
        shop_id = plan_data.get('shop_id')
        plan_value = plan_data.get('plan_value')
        
        if not all([year_id, metric_id, shop_id, plan_value is not None]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Все поля обязательны"
            )
        
        # Проверяем существование связанных объектов
        period_stmt = select(PeriodModel).where(PeriodModel.id == UUID(year_id))
        metric_stmt = select(MetricModel).where(MetricModel.id == UUID(metric_id))
        shop_stmt = select(ShopModel).where(ShopModel.id == UUID(shop_id))
        
        period_result = await session.execute(period_stmt)
        metric_result = await session.execute(metric_stmt)
        shop_result = await session.execute(shop_stmt)
        
        period = period_result.scalar_one_or_none()
        metric = metric_result.scalar_one_or_none()
        shop = shop_result.scalar_one_or_none()
        
        if not period:
            raise HTTPException(status_code=404, detail="Период не найден")
        if not metric:
            raise HTTPException(status_code=404, detail="Метрика не найдена")
        if not shop:
            raise HTTPException(status_code=404, detail="Магазин не найден")
        
        # Проверяем, существует ли уже план для этой комбинации
        existing_stmt = select(PlanValueModel).where(
            PlanValueModel.period_id == UUID(year_id),
            PlanValueModel.metric_id == UUID(metric_id),
            PlanValueModel.shop_id == UUID(shop_id)
        )
        existing_result = await session.execute(existing_stmt)
        existing_plan = existing_result.scalar_one_or_none()
        
        if existing_plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="План для этой комбинации года, метрики и магазина уже существует"
            )
        
        # Создаем новый годовой план
        new_plan = PlanValueModel(
            period_id=UUID(year_id),
            metric_id=UUID(metric_id),
            shop_id=UUID(shop_id),
            value=Decimal(str(plan_value))
        )
        
        session.add(new_plan)
        await session.commit()
        await session.refresh(new_plan)
        
        return {
            'id': new_plan.id,
            'year_id': year_id,
            'metric_id': metric_id,
            'shop_id': shop_id,
            'plan_value': float(new_plan.value)
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании годового плана: {str(e)}"
        )

@router.put("/{plan_id}", response_model=dict)
async def update_yearly_plan(
    plan_id: UUID,
    plan_data: dict,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление годового плана."""
    try:
        stmt = select(PlanValueModel).where(PlanValueModel.id == plan_id)
        result = await session.execute(stmt)
        plan = result.scalar_one_or_none()
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Годовой план не найден"
            )
        
        # Обновляем поля
        if 'plan_value' in plan_data:
            plan.value = Decimal(str(plan_data['plan_value']))
        
        if 'year_id' in plan_data and plan_data['year_id']:
            plan.period_id = UUID(plan_data['year_id'])
        
        if 'metric_id' in plan_data and plan_data['metric_id']:
            plan.metric_id = UUID(plan_data['metric_id'])
        
        if 'shop_id' in plan_data and plan_data['shop_id']:
            plan.shop_id = UUID(plan_data['shop_id'])
        
        await session.commit()
        await session.refresh(plan)
        
        return {
            'id': plan.id,
            'year_id': str(plan.period_id),
            'metric_id': str(plan.metric_id),
            'shop_id': str(plan.shop_id),
            'plan_value': float(plan.value)
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении годового плана: {str(e)}"
        )

@router.delete("/{plan_id}")
async def delete_yearly_plan(
    plan_id: UUID,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление годового плана."""
    try:
        stmt = select(PlanValueModel).where(PlanValueModel.id == plan_id)
        result = await session.execute(stmt)
        plan = result.scalar_one_or_none()
        
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Годовой план не найден"
            )
        
        await session.delete(plan)
        await session.commit()
        
        return {"success": True, "message": "Годовой план успешно удален"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении годового плана: {str(e)}"
        ) 
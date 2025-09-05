from typing import Optional
from uuid import UUID

from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from src.model.user_avatar import UserAvatar
from src.scheme.user_avatar import UserAvatarCreate, UserAvatarResponse
from src.service.base import BaseService


class UserAvatarService:
    """Сервис для работы с аватарами пользователей."""
    
    def __init__(self):
        pass
    
    async def upload_avatar(self, user_id: UUID, file: UploadFile, session: AsyncSession) -> UserAvatarResponse:
        """Загрузить аватар пользователя."""
        try:
            # Деактивировать предыдущий аватар
            stmt = update(UserAvatar).where(
                UserAvatar.user_id == user_id,
                UserAvatar.is_active == True
            ).values(is_active=False)
            await session.execute(stmt)
            
            # Создать новый аватар
            file_data = await file.read()
            
            create_data = UserAvatarCreate(
                user_id=user_id,
                filename=file.filename or "avatar",
                content_type=file.content_type or "image/jpeg",
                file_size=len(file_data),
                file_data=file_data
            )
            
            avatar = UserAvatar(
                user_id=create_data.user_id,
                filename=create_data.filename,
                content_type=create_data.content_type,
                file_size=create_data.file_size,
                file_data=create_data.file_data,
                is_active=True
            )
            
            session.add(avatar)
            await session.commit()
            await session.refresh(avatar)
            
            return UserAvatarResponse.model_validate(avatar)
        except Exception as e:
            await session.rollback()
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка загрузки аватара: {str(e)}"
            )
    
    async def get_active_avatar(self, user_id: UUID, session: AsyncSession) -> Optional[UserAvatarResponse]:
        """Получить активный аватар пользователя."""
        query = select(UserAvatar).where(
            UserAvatar.user_id == user_id,
            UserAvatar.is_active == True
        )
        result = await session.execute(query)
        avatar = result.scalar_one_or_none()
        
        return UserAvatarResponse.model_validate(avatar) if avatar else None
        
    async def get_by_id(self, avatar_id: UUID, session: AsyncSession) -> Optional[UserAvatar]:
        """Получить аватар по ID."""
        query = select(UserAvatar).where(UserAvatar.id == avatar_id)
        result = await session.execute(query)
        return result.scalar_one_or_none() 
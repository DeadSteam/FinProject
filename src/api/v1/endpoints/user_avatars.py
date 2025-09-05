from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.repository.db import users_db
from src.scheme.user_avatar import UserAvatarResponse
from src.scheme.users import User
from src.service.user_avatar import UserAvatarService
from src.api.v1.endpoints.users import get_active_user


router = APIRouter()


@router.post("/upload", response_model=UserAvatarResponse)
async def upload_avatar(
    user_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Загрузить аватар пользователя.
    
    - **user_id**: ID пользователя
    - **file**: Файл аватара (только изображения)
    """
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Поддерживаются только изображения")
    
    try:
        content_length = int(file.headers.get('content-length', 0))
    except (ValueError, TypeError):
        content_length = 0
    
    # Проверка размера файла (5MB максимум)
    if content_length > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="Файл слишком большой (максимум 5MB)")
    
    service = UserAvatarService()
    return await service.upload_avatar(user_id, file, session)


@router.get("/user/{user_id}", response_model=Optional[UserAvatarResponse])
async def get_user_avatar(
    user_id: UUID,
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Получить активный аватар пользователя.
    
    - **user_id**: ID пользователя
    """
    service = UserAvatarService()
    avatar = await service.get_active_avatar(user_id, session)
    
    return avatar


@router.get("/me", response_model=Optional[UserAvatarResponse])
async def get_current_user_avatar(
    current_user: User = Depends(get_active_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Получить активный аватар текущего пользователя.
    """
    service = UserAvatarService()
    avatar = await service.get_active_avatar(current_user.id, session)
    
    return avatar


@router.get("/{avatar_id}/download")
async def download_avatar(
    avatar_id: UUID,
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Скачать аватар.
    
    - **avatar_id**: ID аватара
    """
    service = UserAvatarService()
    avatar = await service.get_by_id(avatar_id, session)
    
    if not avatar:
        raise HTTPException(status_code=404, detail="Аватар не найден")
    
    if not avatar.is_active:
        raise HTTPException(status_code=410, detail="Аватар неактивен")
    
    return Response(
        content=avatar.file_data,
        media_type=avatar.content_type,
        headers={"Content-Disposition": f"inline; filename={avatar.filename}"}
    )


@router.delete("/{avatar_id}")
async def delete_avatar(
    avatar_id: UUID,
    current_user: User = Depends(get_active_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Удалить аватар.
    
    - **avatar_id**: ID аватара
    """
    service = UserAvatarService()
    avatar = await service.get_by_id(avatar_id, session)
    
    if not avatar:
        raise HTTPException(status_code=404, detail="Аватар не найден")
    
    # Проверяем, что аватар принадлежит текущему пользователю
    if avatar.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет прав для удаления этого аватара")
    
    await session.delete(avatar)
    await session.commit()
    
    return {"message": "Аватар успешно удален"} 
 



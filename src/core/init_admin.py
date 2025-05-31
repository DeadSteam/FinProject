from typing import Optional
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.model.users import User, Role
from src.service.users import UserService, role_service
from src.core.config import settings
from src.repository.db import users_db
from src.scheme.users import UserCreate, RoleCreate

async def create_admin_role(session: AsyncSession) -> Optional[Role]:
    """Создает роль администратора, если она не существует."""
    print("[ADMIN] Проверяем существование роли администратора...")
    admin_role = await role_service.get_by_name(name="admin", session=session)
    if not admin_role:
        print("[ADMIN] Роль администратора не найдена, создаем...")
        role_data = RoleCreate(name="admin")
        admin_role = await role_service.create(obj_in=role_data, session=session)
        print("[ADMIN] Создана роль администратора")
    else:
        print("[ADMIN] Роль администратора уже существует")
    return admin_role

async def create_admin_user(session: AsyncSession, role: Role) -> Optional[User]:
    """Создает пользователя-администратора, если он не существует."""
    print("[ADMIN] Инициализация сервиса пользователей...")
    user_service = UserService()
    
    # Проверяем существование администратора
    print("[ADMIN] Проверяем существование администратора...")
    admin = await user_service.get_by_username(username="admin", session=session)
    if not admin:
        print("[ADMIN] Администратор не найден, создаем...")
        # Создаем администратора
        admin_data = UserCreate(
            username="admin",
            password=settings.ADMIN_PASSWORD,
            email=settings.ADMIN_EMAIL,
            status=True,
            role_id=role.id
        )
        print(f"[ADMIN] Данные для создания: {admin_data}")
        admin = await user_service.create(obj_in=admin_data, session=session)
        print("[ADMIN] Создан пользователь-администратор")
    else:
        print("[ADMIN] Администратор уже существует")
    return admin

async def init_admin():
    """Инициализирует роль и пользователя администратора."""
    print("[ADMIN] Начало инициализации администратора...")
    try:
        print("[ADMIN] Получаем сессию базы данных...")
        session_gen = users_db.get_session()
        session = await anext(session_gen)
        try:
            # Создаем роль администратора
            admin_role = await create_admin_role(session)
            if not admin_role:
                print("[ADMIN] Ошибка при создании роли администратора")
                return
            
            # Создаем пользователя-администратора
            admin_user = await create_admin_user(session, admin_role)
            if not admin_user:
                print("[ADMIN] Ошибка при создании пользователя-администратора")
                return
            
            await session.commit()
            print("[ADMIN] Инициализация администратора завершена успешно")
        finally:
            print("[ADMIN] Закрываем сессию...")
            await session.close()
            try:
                await session_gen.aclose()
            except Exception:
                pass
    except Exception as e:
        print(f"[ADMIN] Ошибка при инициализации администратора: {str(e)}") 
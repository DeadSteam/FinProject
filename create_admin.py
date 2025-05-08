import asyncio
import logging
from sqlalchemy import select
from pydantic import EmailStr

from src.repository.db import users_db
from src.model.users import User, Role
from src.core.config import settings
from src.service.users import user_service, role_service, pwd_context

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_roles_if_not_exist():
    """Создание ролей, если они не существуют"""
    # Роли для создания
    roles = [
        {"name": "admin"},
        {"name": "manager"},
        {"name": "user"}
    ]
    
    # Создаем или получаем сессию
    async for session in users_db.get_session():
        try:
            # Проверяем существующие роли
            result = await session.execute(select(Role))
            existing_roles = result.scalars().all()
            existing_role_names = {role.name for role in existing_roles}
            
            # Создаем недостающие роли
            created_roles = []
            for role_data in roles:
                if role_data["name"] not in existing_role_names:
                    role = Role(name=role_data["name"])
                    session.add(role)
                    created_roles.append(role_data["name"])
            
            if created_roles:
                await session.commit()
                logger.info(f"Созданы роли: {', '.join(created_roles)}")
            else:
                logger.info("Все роли уже существуют")
            
            # Получаем id роли администратора для создания пользователя
            admin_role = await session.execute(select(Role).where(Role.name == "admin"))
            admin_role = admin_role.scalar_one_or_none()
            
            if not admin_role:
                logger.error("Роль 'admin' не найдена")
                return
            
            # Проверяем существует ли пользователь admin
            admin_user = await session.execute(select(User).where(User.email == "admin@example.com"))
            admin_user = admin_user.scalar_one_or_none()
            
            if not admin_user:
                # Создаем пользователя-администратора
                password_hash = pwd_context.hash("admin123")
                admin_user = User(
                    username="admin",
                    password_hash=password_hash, 
                    email="admin@example.com",
                    role_id=admin_role.id,
                    status=True
                )
                session.add(admin_user)
                await session.commit()
                logger.info("Создан пользователь-администратор")
            else:
                logger.info("Пользователь-администратор уже существует")
                
        except Exception as e:
            await session.rollback()
            logger.error(f"Ошибка при создании ролей: {e}")
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(create_roles_if_not_exist()) 
from typing import List, Optional, Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordBearer

from src.repository.db import users_db
from src.scheme.users import User, UserCreate, UserUpdate, Role, RoleCreate, RoleUpdate, UserRoleResponse
from src.service.users import UserService, RoleService

router = APIRouter()

# Инициализация сервисов
user_service = UserService()
role_service = RoleService()

# Настройка OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Функция для получения текущего пользователя
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Получение текущего пользователя по токену."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = user_service.decode_token(token)
    if token_data is None:
        raise credentials_exception
    user = await user_service.get_by_username(token_data.username, session)
    if user is None:
        raise credentials_exception
    return user

# Функция для проверки активности пользователя
def get_active_user(current_user: User = Depends(get_current_user)):
    """Проверка, что пользователь активен."""
    if not current_user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неактивный пользователь"
        )
    return current_user

# Функция для проверки роли пользователя
def check_role(allowed_roles: List[str]) -> Callable:
    """Проверка роли пользователя."""
    async def _check_role(current_user: User = Depends(get_active_user)):
        if not current_user.role or current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для выполнения операции"
            )
        return current_user
    return _check_role

# Функция-зависимость для администраторов
get_admin_user = check_role(["admin"])

# ------------ Эндпоинты для пользователей ------------
@router.get("/", response_model=List[User])
async def get_users(
    skip: int = 0, 
    limit: int = 100, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Получение списка пользователей."""
    return await user_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/search", response_model=List[User])
async def search_users(
    search: Optional[str] = None,
    status: Optional[bool] = None,
    role_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Поиск и фильтрация пользователей.
    
    - search: поисковый запрос для фильтрации по имени пользователя, email или полному имени
    - status: фильтр по статусу (True - активен, False - неактивен)
    - role_id: фильтр по ID роли
    """
    return await user_service.search_users(
        session=session, 
        search=search, 
        status=status,
        role_id=role_id,
        skip=skip, 
        limit=limit
    )

@router.post("/", response_model=User)
async def create_user(
    user_in: UserCreate, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Регистрация нового пользователя."""
    # Проверка уникальности email
    if user_in.email:
        user = await user_service.get_by_email(email=user_in.email, session=session)
        if user:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с такой электронной почтой уже существует в системе",
            )
    
    # Проверка уникальности номера телефона
    if user_in.phone_number:
        user = await user_service.get_by_phone_number(phone_number=user_in.phone_number, session=session)
        if user:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким номером телефона уже существует в системе",
            )
    
    return await user_service.create(obj_in=user_in, session=session)

@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_active_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Получение данных текущего пользователя."""
    # Получаем полные данные пользователя с ролью
    user = await user_service.get_by_username(current_user.username, session)
    
    # Отладка
    if hasattr(user, 'role') and user.role:
        print(f"GET /me: Пользователь {user.username} имеет роль: {user.role.name}")
    else:
        print(f"GET /me: Пользователь {user.username} не имеет роли")
    
    return user

@router.get("/me/role", response_model=UserRoleResponse)
async def get_current_user_role(
    current_user: User = Depends(get_active_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Получение роли текущего пользователя."""
    # Получаем полные данные пользователя с ролью
    user = await user_service.get_by_username(current_user.username, session)
    
    role_name = None
    if hasattr(user, 'role') and user.role:
        role_name = user.role.name
    
    # Выводим отладочную информацию
    print(f"GET /me/role: Пользователь: {user.username}, Роль: {role_name}")
    
    return {
        "role": role_name, 
        "username": user.username,
        "has_role": role_name is not None
    }

@router.put("/me", response_model=User)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_active_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Обновление данных текущего пользователя."""
    # Проверяем, что email не занят другим пользователем
    if user_in.email and user_in.email != current_user.email:
        existing_user = await user_service.get_by_email(email=user_in.email, session=session)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким email уже существует"
            )
    
    # Проверяем, что номер телефона не занят другим пользователем
    if user_in.phone_number and user_in.phone_number != current_user.phone_number:
        existing_user = await user_service.get_by_phone_number(phone_number=user_in.phone_number, session=session)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким номером телефона уже существует"
            )
    
    # Запрещаем менять роль через этот эндпоинт
    if hasattr(user_in, "role_id"):
        delattr(user_in, "role_id")
    
    updated_user = await user_service.update(
        id=current_user.id,
        obj_in=user_in,
        session=session
    )
    
    return updated_user

# ------------ Эндпоинты для ролей ------------
@router.get("/roles", response_model=List[Role])
async def get_roles(
    skip: int = 0, 
    limit: int = 100, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Получение списка ролей."""
    return await role_service.get_multi(session=session, skip=skip, limit=limit)

@router.post("/roles", response_model=Role)
async def create_role(
    role_in: RoleCreate, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Создание новой роли."""
    existing_role = await role_service.get_by_name(role_in.name, session)
    if existing_role:
        raise HTTPException(
            status_code=400,
            detail=f"Роль с именем '{role_in.name}' уже существует"
        )
    return await role_service.create(obj_in=role_in, session=session)

@router.get("/roles/{role_id}", response_model=Role)
async def read_role(
    role_id: UUID, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Получение информации о роли."""
    role = await role_service.get(id=role_id, session=session)
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )
    return role

@router.put("/roles/{role_id}", response_model=Role)
async def update_role(
    role_id: UUID, 
    role_in: RoleUpdate, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Обновление роли."""
    role = await role_service.get(id=role_id, session=session)
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )
    return await role_service.update(id=role_id, obj_in=role_in, session=session)

@router.delete("/roles/{role_id}", status_code=200)
async def delete_role(
    role_id: UUID, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Удаление роли."""
    role = await role_service.get(id=role_id, session=session)
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Роль не найдена"
        )
    # Особая проверка для удаления роли admin
    if role.name == "admin":
        raise HTTPException(
            status_code=400,
            detail="Невозможно удалить роль администратора"
        )
    await role_service.delete(id=role_id, session=session)
    return {"message": f"Роль '{role.name}' успешно удалена"}

@router.get("/{user_id}", response_model=User)
async def read_user(
    user_id: UUID, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Получение информации о пользователе."""
    user = await user_service.get(id=user_id, session=session)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    return user

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: UUID, 
    user_in: UserUpdate, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Обновление данных пользователя администратором."""
    # Проверяем существование пользователя
    user = await user_service.get(id=user_id, session=session)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    
    # Проверяем уникальность email, если он изменен
    if user_in.email and user_in.email != user.email:
        existing_user = await user_service.get_by_email(email=user_in.email, session=session)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким email уже существует"
            )
    
    # Проверяем уникальность номера телефона, если он изменен
    if user_in.phone_number and user_in.phone_number != user.phone_number:
        existing_user = await user_service.get_by_phone_number(phone_number=user_in.phone_number, session=session)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким номером телефона уже существует"
            )
    
    return await user_service.update(id=user_id, obj_in=user_in, session=session)

@router.delete("/{user_id}", status_code=200)
async def delete_user(
    user_id: UUID, 
    current_user: User = Depends(get_admin_user),
    session: AsyncSession = Depends(users_db.get_session)
):
    """Удаление пользователя."""
    user = await user_service.get(id=user_id, session=session)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )
    await user_service.delete(id=user_id, session=session)
    return {"message": f"Пользователь '{user.username}' успешно удален"} 

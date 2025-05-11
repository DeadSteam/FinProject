from typing import Optional, Dict
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.repository.db import users_db
from src.service.users import UserService, role_service
from src.scheme.users import (
    Token, TokenPair, RefreshToken, LoginRequest, 
    User, RegistrationRequest, PasswordResetRequest
)

router = APIRouter()

# Инициализация сервисов
user_service = UserService()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Вспомогательные функции
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Получение текущего пользователя по токену
    """
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
        
    # Проверяем, что пользователь активен
    if not user.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован",
        )
        
    return user


@router.post("/register", response_model=User)
async def register_user(
    registration_data: RegistrationRequest,
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Регистрация нового пользователя
    """
    # Проверяем, что пароли совпадают
    if registration_data.password != registration_data.password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароли не совпадают",
        )
    
    # Проверяем, что пользователь с таким email не существует
    existing_email = await user_service.get_by_email(email=registration_data.email, session=session)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )
    
    # Проверяем, что пользователь с таким username не существует
    existing_username = await user_service.get_by_username(username=registration_data.username, session=session)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует",
        )
    
    # Если указана роль, проверяем её существование
    if registration_data.role_id:
        role = await role_service.get(id=registration_data.role_id, session=session)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Указанная роль не существует",
            )
    
    # Создаем пользователя
    user_data = registration_data.model_dump(exclude={"password_confirm"})
    new_user = await user_service.create(obj_in=user_data, session=session)
    
    return new_user


@router.post("/login", response_model=TokenPair)
async def login(
    login_data: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Авторизация пользователя по email или номеру телефона
    """
    user = await user_service.authenticate(
        email=login_data.email,
        phone_number=login_data.phone_number,
        password=login_data.password,
        session=session
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные для входа",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем данные токена
    token_data: Dict = {"sub": user.username}
    
    # Проверяем наличие роли и добавляем её в данные токена
    if user.role:
        token_data["role"] = user.role.name
        print(f"Добавлена роль в токен: {user.role.name} для пользователя {user.username}")
    else:
        print(f"У пользователя {user.username} нет роли")
    
    # Создаем пару токенов
    tokens = user_service.create_token_pair(token_data)
    
    # Устанавливаем refresh токен в httpOnly куки
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=True,  # Требуется HTTPS
        samesite="strict",  # Дополнительная защита от CSRF
        max_age=60*60*24*30,  # 30 дней
        path="/api/v1/auth/refresh"  # Доступно только для пути /refresh
    )
    
    return tokens


# Для совместимости с OAuth2PasswordRequestForm
@router.post("/token", response_model=TokenPair)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response = None,
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Авторизация с использованием стандартной формы OAuth2
    """
    # Используем username из формы OAuth2 как email
    user = await user_service.authenticate(
        email=form_data.username,  # В стандартной форме OAuth2 используется поле username
        password=form_data.password,
        session=session
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем данные токена
    token_data: Dict = {"sub": user.username}
    
    if user.role:
        token_data["role"] = user.role.name
    
    # Создаем пару токенов
    tokens = user_service.create_token_pair(token_data)
    
    # Устанавливаем refresh токен в httpOnly куки
    if response:
        response.set_cookie(
            key="refresh_token",
            value=tokens.refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=60*60*24*30,
            path="/api/v1/auth/refresh"
        )
    
    return tokens


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: Optional[str] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Получение нового access токена с использованием refresh токена
    """
    # Приоритет refresh токена из тела запроса, затем из куки
    token_value = refresh_token or refresh_token_cookie
    
    if not token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Отсутствует refresh токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Проверяем refresh токен
    token_data = user_service.decode_token(token_value, refresh=True)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Проверяем существование пользователя
    user = await user_service.get_by_username(token_data.username, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не существует",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем новый access токен
    access_token = user_service.create_access_token(data={"sub": user.username})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response):
    """
    Выход из системы (очистка куки с refresh токеном)
    """
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth/refresh"
    )
    
    return {"message": "Успешный выход из системы"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def request_password_reset(
    reset_data: PasswordResetRequest,
    session: AsyncSession = Depends(users_db.get_session)
):
    """
    Запрос на сброс пароля
    """
    user = None
    
    # Ищем пользователя по email
    if reset_data.email:
        user = await user_service.get_by_email(email=reset_data.email, session=session)
    
    # Если не нашли по email, ищем по username
    elif reset_data.username:
        user = await user_service.get_by_username(username=reset_data.username, session=session)
    
    # Если пользователя не нашли, возвращаем успех для безопасности
    if not user:
        return {"message": "Инструкции по сбросу пароля отправлены на вашу почту"}
    
    # В реальном приложении здесь нужно отправить электронное письмо со ссылкой на сброс пароля
    # Для демонстрации просто возвращаем успешный ответ
    
    return {"message": "Инструкции по сбросу пароля отправлены на вашу почту"} 
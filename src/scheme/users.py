import uuid
from typing import Optional, List

from pydantic import Field, EmailStr

from src.scheme.base import BaseSchema, UUIDSchema, UUIDTimestampedSchema


# --- Role схемы ---

class RoleBase(BaseSchema):
    """Базовая схема для роли."""
    name: str


class RoleCreate(RoleBase):
    """Схема для создания роли."""
    pass


class RoleUpdate(RoleBase):
    """Схема для обновления роли."""
    name: Optional[str] = None


class RoleInDB(RoleBase, UUIDTimestampedSchema):
    """Схема роли, хранящейся в БД."""
    pass


class Role(RoleInDB):
    """Полная схема роли."""
    pass


# --- User схемы ---

class UserBase(BaseSchema):
    """Базовая схема для пользователя."""
    username: str
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    status: bool = True


class UserCreate(UserBase):
    """Схема для создания пользователя."""
    password: str
    role_id: Optional[uuid.UUID] = None


class UserUpdate(BaseSchema):
    """Схема для обновления пользователя."""
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role_id: Optional[uuid.UUID] = None
    status: Optional[bool] = None


class UserInDB(UserBase, UUIDTimestampedSchema):
    """Схема пользователя, хранящегося в БД."""
    role_id: Optional[uuid.UUID] = None
    password_hash: str


class User(UserInDB):
    """Полная схема пользователя с отношениями."""
    password_hash: Optional[str] = Field(None, exclude=True)
    role: Optional[Role] = None


# --- Auth схемы ---

class Token(BaseSchema):
    """Схема токена авторизации."""
    access_token: str
    token_type: str = "bearer"


class RefreshToken(BaseSchema):
    """Схема refresh токена."""
    refresh_token: str


class TokenPair(BaseSchema):
    """Схема пары токенов (access и refresh)."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseSchema):
    """Данные, хранящиеся в токене."""
    username: str
    role: Optional[str] = None
    exp: Optional[int] = None


class LoginRequest(BaseSchema):
    """Запрос на вход в систему."""
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str


class RegistrationRequest(UserCreate):
    """Запрос на регистрацию в системе."""
    password_confirm: str


class PasswordResetRequest(BaseSchema):
    """Запрос на сброс пароля."""
    email: EmailStr


class UserRoleResponse(BaseSchema):
    """Ответ с информацией о роли пользователя."""
    role: Optional[str] = None
    username: str
    has_role: bool 
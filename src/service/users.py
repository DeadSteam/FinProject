import uuid
from typing import Optional, List, Union, Dict, Any
import time
from datetime import timedelta, datetime

from passlib.context import CryptContext
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError
from pydantic import TypeAdapter

from src.repository import users_db
from src.core.config import settings
from src.model.users import User, Role
from src.scheme.users import (
    UserCreate, UserUpdate, User as UserSchema,
    RoleCreate, RoleUpdate, Role as RoleSchema,
    TokenData, RefreshToken, TokenPair
)
from src.service.base import BaseService

# Создаем контекст шифрования для паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Настройки для JWT токенов
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# Временный кэш для отслеживания неудачных попыток входа
failed_login_attempts = {}


class RoleService(BaseService[Role, RoleSchema, RoleCreate, RoleUpdate]):
    """Сервис для работы с ролями пользователей."""
    
    def __init__(self):
        super().__init__(users_db, Role, RoleSchema)
    
    async def get_by_name(self, name: str, session: AsyncSession) -> Optional[RoleSchema]:
        """Получение роли по названию."""
        query = select(self.model).where(self.model.name == name)
        result = await session.execute(query)
        db_obj = result.scalar_one_or_none()
        if not db_obj:
            return None
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)


class UserService(BaseService[User, UserSchema, UserCreate, UserUpdate]):
    """Сервис для работы с пользователями."""
    
    def __init__(self):
        super().__init__(users_db, User, UserSchema)
    
    def _hash_password(self, password: str) -> str:
        """Хеширование пароля."""
        return pwd_context.hash(password)
    
    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля."""
        return pwd_context.verify(plain_password, hashed_password)
    
    async def get_by_username(self, username: str, session: AsyncSession) -> Optional[UserSchema]:
        """Получение пользователя по имени пользователя."""
        query = select(self.model).options(
            selectinload(self.model.role),
            selectinload(self.model.avatars)
        ).where(self.model.username == username)
        result = await session.execute(query)
        db_obj = result.scalar_one_or_none()
        if not db_obj:
            return None
        user_data = TypeAdapter(self.schema).validate_python(db_obj)
        # Добавляем avatar_url
        if hasattr(db_obj, "avatars") and db_obj.avatars:
            active_avatar = next((a for a in db_obj.avatars if a.is_active), None)
            if active_avatar:
                user_data.avatar_url = f"/api/v1/avatars/{active_avatar.id}"
            else:
                user_data.avatar_url = None
        else:
            user_data.avatar_url = None
        return user_data
    
    async def get_by_email(self, email: str, session: AsyncSession) -> Optional[UserSchema]:
        """Получение пользователя по email."""
        query = select(self.model).options(
            selectinload(self.model.role),
            selectinload(self.model.avatars)
        ).where(self.model.email == email)
        result = await session.execute(query)
        db_obj = result.scalar_one_or_none()
        if not db_obj:
            return None
        user_data = TypeAdapter(self.schema).validate_python(db_obj)
        if hasattr(db_obj, "avatars") and db_obj.avatars:
            active_avatar = next((a for a in db_obj.avatars if a.is_active), None)
            if active_avatar:
                user_data.avatar_url = f"/api/v1/avatars/{active_avatar.id}"
            else:
                user_data.avatar_url = None
        else:
            user_data.avatar_url = None
        return user_data
    
    async def get_by_phone_number(self, phone_number: str, session: AsyncSession) -> Optional[UserSchema]:
        """Получение пользователя по номеру телефона."""
        query = select(self.model).options(
            selectinload(self.model.role),
            selectinload(self.model.avatars)
        ).where(self.model.phone_number == phone_number)
        result = await session.execute(query)
        db_obj = result.scalar_one_or_none()
        if not db_obj:
            return None
        user_data = TypeAdapter(self.schema).validate_python(db_obj)
        if hasattr(db_obj, "avatars") and db_obj.avatars:
            active_avatar = next((a for a in db_obj.avatars if a.is_active), None)
            if active_avatar:
                user_data.avatar_url = f"/api/v1/avatars/{active_avatar.id}"
            else:
                user_data.avatar_url = None
        else:
            user_data.avatar_url = None
        return user_data
    
    async def get_multi(self, session: AsyncSession, skip: int = 0, limit: int = 100) -> List[UserSchema]:
        """Получение списка пользователей с пагинацией и загрузкой связанных объектов."""
        query = (
            select(self.model)
            .options(selectinload(self.model.role), selectinload(self.model.avatars))
            .offset(skip)
            .limit(limit)
        )
        result = await session.execute(query)
        db_objs = result.scalars().all()
        users = []
        for db_obj in db_objs:
            user_data = TypeAdapter(self.schema).validate_python(db_obj)
            if hasattr(db_obj, "avatars") and db_obj.avatars:
                active_avatar = next((a for a in db_obj.avatars if a.is_active), None)
                if active_avatar:
                    user_data.avatar_url = f"/api/v1/avatars/{active_avatar.id}"
                else:
                    user_data.avatar_url = None
            else:
                user_data.avatar_url = None
            users.append(user_data)
        return users
    
    async def search_users(
        self,
        session: AsyncSession,
        search: Optional[str] = None,
        status: Optional[bool] = None,
        role_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserSchema]:
        """
        Поиск и фильтрация пользователей.
        
        Args:
            session: Сессия БД
            search: Поисковая строка для фильтрации по имени пользователя, email, номеру телефона и полному имени
            status: Фильтр по статусу (True - активен, False - неактивен)
            role_id: Фильтр по ID роли
            skip: Смещение для пагинации
            limit: Ограничение количества результатов для пагинации
        
        Returns:
            Список пользователей, соответствующих критериям фильтрации
        """
        conditions = []
        
        # Применяем поисковый фильтр, если он указан
        if search and search.strip():
            search_term = f"%{search.lower()}%"
            conditions.append(
                or_(
                    self.model.username.ilike(search_term),
                    self.model.email.ilike(search_term),
                    self.model.phone_number.ilike(search_term),
                    self.model.full_name.ilike(search_term)
                )
            )
        
        # Фильтр по статусу
        if status is not None:
            conditions.append(self.model.status == status)
        
        # Фильтр по роли
        if role_id is not None:
            conditions.append(self.model.role_id == role_id)
        
        # Формируем запрос с учетом всех фильтров
        if conditions:
            query = select(self.model).options(
                selectinload(self.model.role)
            ).where(and_(*conditions))
        else:
            query = select(self.model).options(
                selectinload(self.model.role)
            )
        
        # Добавляем пагинацию
        query = query.offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        # Конвертируем результаты в схемы Pydantic
        return [TypeAdapter(self.schema).validate_python(obj) for obj in db_objs]
    
    async def create(self, obj_in: UserCreate, session: AsyncSession) -> UserSchema:
        """Создание нового пользователя."""
        # Хешируем пароль перед сохранением
        hashed_password = self._hash_password(obj_in.password)
        obj_data = obj_in.model_dump(exclude={"password"})
        obj_data["password_hash"] = hashed_password
        
        db_obj = await self.db.create(self.model, obj_data, session)
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def update(
        self, id: uuid.UUID, obj_in: Union[UserUpdate, Dict[str, Any]], session: AsyncSession
    ) -> Optional[UserSchema]:
        """Обновление существующего пользователя."""
        update_data = obj_in.model_dump(exclude_unset=True) if not isinstance(obj_in, dict) else obj_in
        
        # Если в данных есть пароль, хешируем его
        if "password" in update_data:
            hashed_password = self._hash_password(update_data["password"])
            del update_data["password"]
            update_data["password_hash"] = hashed_password
        
        db_obj = await super().update(id, update_data, session)
        if db_obj:
            return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
        return None
    
    def _check_login_attempts(self, identifier: str) -> bool:
        """
        Проверяет количество неудачных попыток входа.
        Возвращает True, если пользователь не заблокирован.
        """
        current_time = time.time()
        if identifier in failed_login_attempts:
            attempts = failed_login_attempts[identifier]
            
            # Проверяем, истек ли срок блокировки
            if attempts["locked_until"] and attempts["locked_until"] > current_time:
                return False
            
            # Если срок блокировки истек, сбрасываем счетчик
            if attempts["locked_until"] and attempts["locked_until"] <= current_time:
                failed_login_attempts[identifier] = {"count": 0, "locked_until": None}
        
        return True
    
    def _record_failed_attempt(self, identifier: str):
        """Записывает неудачную попытку входа."""
        current_time = time.time()
        
        if identifier not in failed_login_attempts:
            failed_login_attempts[identifier] = {"count": 1, "locked_until": None}
        else:
            attempts = failed_login_attempts[identifier]
            attempts["count"] += 1
            
            # Если счетчик достиг предела, блокируем пользователя
            if attempts["count"] >= settings.MAX_FAILED_ATTEMPTS:
                attempts["locked_until"] = current_time + settings.LOGIN_LOCKOUT_TIME
    
    def _reset_failed_attempts(self, identifier: str):
        """Сброс счетчика неудачных попыток входа."""
        if identifier in failed_login_attempts:
            del failed_login_attempts[identifier]
    
    async def authenticate(
        self, 
        email: Optional[str] = None, 
        phone_number: Optional[str] = None,
        password: str = None, 
        session: AsyncSession = None
    ) -> Optional[UserSchema]:
        """
        Аутентификация пользователя по email или телефону и паролю.
        
        Args:
            email: Email пользователя
            phone_number: Номер телефона пользователя
            password: Пароль
            session: Сессия БД
        
        Returns:
            Данные пользователя в случае успешной аутентификации, None в противном случае
        """
        # Проверяем, что передан хотя бы один идентификатор
        if not (email or phone_number):
            print("Не указан ни email, ни phone_number")
            return None
        
        # Используем первый непустой идентификатор для проверки блокировки
        identifier = email or phone_number
        
        # Проверяем, не заблокирован ли пользователь за слишком много попыток входа
        if not self._check_login_attempts(identifier):
            print(f"Слишком много попыток входа для {identifier}")
            return None
        
        # Получаем пользователя по указанному идентификатору
        if email:
            user = await self.get_by_email(email, session)
        elif phone_number:
            user = await self.get_by_phone_number(phone_number, session)
        else:
            user = None
        
        # Если пользователь не найден или пароль неверный, записываем попытку входа
        if not user:
            print(f"Пользователь не найден для {identifier}")
            self._record_failed_attempt(identifier)
            return None
        
        # Проверяем статус пользователя
        if not user.status:
            print(f"Пользователь {identifier} деактивирован")
            return None
        
        # Проверяем пароль
        if not self._verify_password(password, user.password_hash):
            print(f"Неверный пароль для {identifier}")
            self._record_failed_attempt(identifier)
            return None
        
        # Сбрасываем счетчик неудачных попыток
        self._reset_failed_attempts(identifier)
        
        return user
    
    def create_token_pair(self, user_data: Dict) -> TokenPair:
        """Создает пару токенов (access и refresh)."""
        # Создаем данные для access токена
        access_token_data = user_data.copy()
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data=access_token_data, 
            expires_delta=access_token_expires
        )
        
        # Создаем данные для refresh токена
        refresh_token_data = {
            "sub": user_data["sub"],
            "type": "refresh"
        }
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token = self.create_access_token(
            data=refresh_token_data, 
            expires_delta=refresh_token_expires
        )
        
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    
    def create_access_token(self, data: Dict, expires_delta: Optional[timedelta] = None) -> str:
        """Создание JWT токена."""
        to_encode = data.copy()
        
        # Устанавливаем время истечения токена
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def decode_token(self, token: str) -> Optional[TokenData]:
        """Декодирование JWT токена."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            role: str = payload.get("role")
            exp: int = payload.get("exp")
            
            if username is None:
                return None
                
            return TokenData(username=username, role=role, exp=exp)
        except JWTError:
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """Обновление access токена с помощью refresh токена."""
        try:
            payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Проверяем, что это refresh токен
            if payload.get("type") != "refresh":
                return None
            
            # Проверяем срок действия
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
                return None
            
            # Создаем новый access токен
            username = payload.get("sub")
            if not username:
                return None
            
            access_token_data = {"sub": username}
            if "role" in payload:
                access_token_data["role"] = payload["role"]
            
            return self.create_access_token(access_token_data)
            
        except JWTError:
            return None


# Инициализация сервисов
role_service = RoleService()
user_service = UserService() 
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine, AsyncSession, async_sessionmaker
import redis.asyncio as aioredis
import json
import uuid
import datetime
import re
from typing import Any, Optional

from src.core.config import settings


# Кастомный JSON-энкодер для обработки UUID и других специальных типов
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            # Преобразуем UUID в строку
            return str(obj)
        elif isinstance(obj, (datetime.datetime, datetime.date)):
            # Преобразуем даты и время в ISO формат
            return obj.isoformat()
        elif isinstance(obj, datetime.timedelta):
            # Преобразуем timedelta в секунды
            return obj.total_seconds()
        # Другие специальные типы можно обработать здесь
        return super().default(obj)


# Регулярное выражение для распознавания строк в ISO формате даты/времени
ISO_DATE_REGEX = re.compile(r'^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$')


def parse_json_with_dates(json_str: str) -> Any:
    """
    Парсит JSON-строку, пытаясь преобразовать строки в ISO формате в объекты datetime.
    """
    def object_hook(obj):
        for key, value in obj.items():
            if isinstance(value, str) and ISO_DATE_REGEX.match(value):
                try:
                    if 'T' in value:
                        # Это datetime
                        obj[key] = datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
                    else:
                        # Это date
                        obj[key] = datetime.date.fromisoformat(value)
                except (ValueError, TypeError):
                    # Если не удается преобразовать, оставляем как есть
                    pass
        return obj
    
    return json.loads(json_str, object_hook=object_hook)


class DBHelper:
    def __init__(
        self,
        url: str,
        echo: bool = False,
        echo_pool: bool = False
    ):
        self.engine: AsyncEngine = create_async_engine(
            url,
            echo=echo,
            echo_pool=echo_pool,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
        )
        self.session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            bind=self.engine,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

    async def dispose(self):
        await self.engine.dispose()

    async def session_getter(self):
        async with self.session_factory as session:
            yield session


class RedisHelper:
    def __init__(
        self,
        url: str,
        encoding: str = "utf-8",
        decode_responses: bool = True,
    ):
        self.client = aioredis.from_url(
            url,
            encoding=encoding,
            decode_responses=decode_responses,
        )
        self.default_timeout = settings.REDIS_DEFAULT_TIMEOUT
        print(f"Инициализирован Redis-клиент с URL: {url}")
    
    async def set(self, key: str, value: Any, expire: int = None) -> bool:
        """Сохранение данных в Redis с временем истечения."""
        try:
            if not isinstance(value, (str, int, float, bool)):
                # Преобразуем сложные объекты в JSON с использованием кастомного энкодера
                print(f"Сериализация объекта для ключа '{key}', тип: {type(value)}")
                serialized_value = json.dumps(value, cls=CustomJSONEncoder)
            else:
                serialized_value = value
            
            # Используем значение по умолчанию из настроек, если expire не указан
            if expire is None:
                expire = self.default_timeout
            
            result = await self.client.set(key, serialized_value, ex=expire)
            print(f"Результат сохранения в Redis для ключа '{key}': {result}")
            return result
        except Exception as e:
            print(f"Ошибка при сохранении в Redis: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Получение данных из Redis."""
        try:
            value = await self.client.get(key)
            if value is None:
                print(f"Ключ '{key}' не найден в Redis")
                return None
            
            print(f"Получено значение из Redis для ключа '{key}', тип: {type(value)}")
            
            # Пробуем десериализовать, если это JSON
            try:
                if isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                    # Используем нашу функцию для десериализации с поддержкой дат
                    deserialized_value = parse_json_with_dates(value)
                    print(f"Успешно десериализован JSON для ключа '{key}'")
                    return deserialized_value
                return value
            except (TypeError, json.JSONDecodeError) as e:
                print(f"Ошибка десериализации для ключа '{key}': {str(e)}")
                return value
        except Exception as e:
            print(f"Ошибка при получении из Redis для ключа '{key}': {str(e)}")
            import traceback
            print(traceback.format_exc())
            return None
    
    async def delete(self, key: str) -> bool:
        """Удаление данных из Redis."""
        try:
            result = await self.client.delete(key) > 0
            print(f"Удален ключ '{key}' из Redis: {result}")
            return result
        except Exception as e:
            print(f"Ошибка при удалении ключа '{key}' из Redis: {str(e)}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Проверка существования ключа в Redis."""
        try:
            result = await self.client.exists(key) > 0
            print(f"Проверка существования ключа '{key}' в Redis: {result}")
            return result
        except Exception as e:
            print(f"Ошибка при проверке существования ключа '{key}' в Redis: {str(e)}")
            return False


# Создаем хелперы для баз данных
users_db_helper = DBHelper(
    url=settings.USERS_DATABASE_URL,
    echo=False,
    echo_pool=False,
)

finances_db_helper = DBHelper(
    url=settings.DATABASE_URL,
    echo=False,
    echo_pool=False,
)

# Создаем Redis-хелпер
redis_helper = RedisHelper(
    url=settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
) 
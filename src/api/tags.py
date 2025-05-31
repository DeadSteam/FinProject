"""
Конфигурация тегов API для документации Swagger/OpenAPI.
"""

from typing import List, Dict

API_TAGS: List[Dict[str, str]] = [
    {"name": "Магазины", "description": "Операции с магазинами"},
    {"name": "Категории", "description": "Операции с категориями расходов"},
    {"name": "Метрики", "description": "Операции с метриками"},
    {"name": "Периоды", "description": "Операции с временными периодами"},
    {"name": "Плановые значения", "description": "Операции с плановыми значениями метрик"},
    {"name": "Фактические значения", "description": "Операции с фактическими значениями метрик"},
    {"name": "Изображения", "description": "Операции с изображениями"},
    {"name": "Аналитика", "description": "Аналитические отчеты"},
    {"name": "Пользователи", "description": "Управление пользователями"},
    {"name": "Авторизация", "description": "Авторизация и аутентификация"}
]

# Словарь для быстрого доступа к тегам по имени
TAGS_DICT: Dict[str, Dict[str, str]] = {tag["name"]: tag for tag in API_TAGS} 
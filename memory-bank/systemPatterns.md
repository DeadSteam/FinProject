# Системные паттерны PriFin

## Архитектурные принципы

### 1. Microservices в Docker
- Каждый компонент изолирован в контейнере
- Независимое масштабирование сервисов
- Service discovery через Docker networks

### 2. Database Separation
- `finance_db` - бизнес-данные (категории, операции, планы)
- `users_db` - авторизация и пользователи
- Разделение ответственности и безопасности

### 3. Stateless Backend
- JWT токены для авторизации
- Redis для сессий и кэширования
- Горизонтальное масштабирование

## Backend паттерны

### Repository Pattern
```python
# Абстракция доступа к данным
class CategoryRepository:
    async def get_all(self) -> List[Category]
    async def create(self, data: CategoryCreate) -> Category
```

### Service Layer
```python
# Бизнес-логика отделена от контроллеров
class CategoryService:
    def __init__(self, repo: CategoryRepository)
    async def create_category(self, data, user_id)
```

### Dependency Injection
- FastAPI встроенная DI система
- Автоматическое разрешение зависимостей
- Легкое тестирование с mock объектами

## Frontend паттерны

### Текущий (Vanilla JS)
- ES6 modules без сборщиков
- Adaptive API URL detection
- Component-like структура файлов

### Новый (React)
- Component-based архитектура  
- Context API для состояния
- Custom hooks для логики
- CSS Modules для стилей

## Конфигурационные паттерны

### Environment-driven
- Все настройки через .env переменные
- HOST параметризация для окружений
- Docker-compose inheritance: `${HOST}`

### CORS flexibility
```yaml
environment:
  - CORS_ORIGINS=http://${HOST}:3000,http://${HOST}:3001
```

## Безопасность

### Авторизация
- JWT access tokens (15 мин)
- Refresh tokens (7 дней)
- bcrypt для паролей
- Rate limiting через slowapi

### API безопасность
- CORS headers настроены
- SQL injection защита через SQLAlchemy
- Input validation через Pydantic

## Производительность

### База данных
- Async SQLAlchemy для неблокирующих запросов
- Connection pooling: DB_POOL_SIZE=5
- Индексы на часто используемых полях

### Кэширование
- Redis для сессий
- HTTP кэши для статики
- Database query caching

### Frontend оптимизации
- Код сплиттинг в React версии  
- Lazy loading компонентов
- Минификация в production 
 
 
 
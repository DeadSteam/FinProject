# Системные паттерны и архитектура

## Общая архитектура
**Микросервисная архитектура в Docker-контейнерах:**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Nginx       │    │    Frontend      │    │    Backend      │
│   (Reverse      │────│   (Static JS)    │────│   (FastAPI)     │
│    Proxy)       │    │   Port: 3000     │    │   Port: 8000    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         │              ┌──────────────────┐            │
         └──────────────│      Redis       │────────────┘
                        │   (Sessions)     │
                        │   Port: 6379     │
                        └──────────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
         ┌─────────────────┐         ┌─────────────────┐
         │  Finance DB     │         │   Users DB      │
         │ (PostgreSQL)    │         │ (PostgreSQL)    │
         │  Port: 5432     │         │  Port: 5432     │
         └─────────────────┘         └─────────────────┘
```

## Ключевые архитектурные решения

### 1. Разделение баз данных
- **finance_db** - бизнес-данные (метрики, планы, факты)
- **users_db** - пользователи, роли, авторизация
- **Причина**: разграничение ответственности и безопасности

### 2. Stateless backend
- Сессии хранятся в Redis
- JWT токены для авторизации
- Горизонтальное масштабирование

### 3. API-first подход
- REST API с OpenAPI документацией
- Версионирование API (/api/v1/)
- Единый точка входа для всех операций

### 4. Frontend как SPA
- Vanilla JavaScript (без фреймворков)
- Модульная архитектура
- Относительные пути для универсальности

## Паттерны проектирования

### Backend (Python/FastAPI)

#### 1. Repository Pattern
```python
# Абстракция доступа к данным
class BaseRepository:
    async def get(self, id: str)
    async def create(self, data: dict)
    async def update(self, id: str, data: dict)
    async def delete(self, id: str)
```

#### 2. Service Layer Pattern
```python
# Бизнес-логика отделена от контроллеров
class MetricService:
    def __init__(self, repo: MetricRepository)
    async def create_metric_with_periods(...)
    async def calculate_deviations(...)
```

#### 3. Dependency Injection
```python
# FastAPI встроенная DI система
@app.get("/metrics")
async def get_metrics(
    service: MetricService = Depends(get_metric_service)
):
```

#### 4. Settings Pattern
```python
# Централизованная конфигурация через Pydantic
class Settings(BaseSettings):
    HOST: str
    DATABASE_URL: str
    # Автоматическое чтение из .env
```

### Frontend (JavaScript)

#### 1. Module Pattern
```javascript
// Модульная организация кода
export class ApiClient { ... }
export const config = { ... }
```

#### 2. Factory Pattern
```javascript
// Создание элементов UI
function createMetricModal() { ... }
function createEditValueModal() { ... }
```

#### 3. Observer Pattern
```javascript
// Event-driven обновления UI
document.addEventListener('change', updateData)
button.addEventListener('click', handleClick)
```

## Принципы организации кода

### 1. Разделение по слоям
```
Backend:
├── src/api/          # API endpoints
├── src/core/         # Конфигурация, middleware
├── src/models/       # Модели данных
├── src/services/     # Бизнес-логика
└── src/repositories/ # Доступ к данным

Frontend:
├── scripts/auth/     # Авторизация
├── scripts/pages/    # Страницы
├── scripts/utils/    # Утилиты
└── scripts/config.js # Конфигурация
```

### 2. Конфигурация через переменные окружения
- Все настройки в .env файле
- Автоматическая адаптация к среде (dev/prod)
- Нет жестко закодированных значений

### 3. Error Handling
- Централизованная обработка ошибок
- Логирование всех операций
- Graceful degradation

### 4. Security Patterns
- JWT токены с истечением срока
- CORS настройки
- Rate limiting
- Хеширование паролей bcrypt

## Интеграционные паттерны

### 1. Database Connection Pooling
```python
# Пул соединений для производительности
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
```

### 2. Health Checks
```yaml
# Docker health checks для всех сервисов
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 5s
```

### 3. Graceful Startup
```bash
# Ожидание готовности зависимых сервисов
wait_for_postgres()
wait_for_redis()
```

## Масштабирование

### Горизонтальное:
- Stateless backend - можно запускать N экземпляров
- Load balancer через nginx
- Shared Redis для сессий

### Вертикальное:
- Database connection pooling
- Redis кэширование
- Async I/O в FastAPI

## Мониторинг и логирование
- Структурированное логирование
- Health check endpoints
- Метрики производительности через FastAPI middleware 
# Технический контекст

## Технологический стек

### Backend
- **Язык**: Python 3.11+
- **Фреймворк**: FastAPI 0.103+
- **ORM**: SQLAlchemy 2.0 (async)
- **База данных**: PostgreSQL 15
- **Кэш**: Redis 7
- **Миграции**: Alembic
- **Валидация**: Pydantic v2
- **Авторизация**: JWT + OAuth2
- **Хеширование**: bcrypt
- **Rate Limiting**: slowapi

### Frontend  
- **Язык**: Vanilla JavaScript (ES6+)
- **Модули**: ES6 modules
- **Графики**: Chart.js
- **Экспорт**: SheetJS (xlsx)
- **Сборка**: Нет (нативные модули)
- **HTTP**: Fetch API
- **Стили**: CSS Variables + Flexbox/Grid

### Инфраструктура
- **Контейнеризация**: Docker + Docker Compose
- **Веб-сервер**: Nginx (reverse proxy)
- **ASGI сервер**: Uvicorn
- **Статические файлы**: http-server (Node.js)
- **Оркестрация**: Docker Compose v3.8

### DevOps
- **CI/CD**: Готов к настройке GitHub Actions
- **Мониторинг**: FastAPI встроенные метрики
- **Логирование**: Python logging + structured logs
- **Конфигурация**: .env файлы + Pydantic Settings

## Архитектура развертывания

### Development (текущая)
```bash
# Локальная разработка
HOST=localhost
PORT=8000
DEBUG=True
```

### Production (готова к деплою)
```bash
# Изменить только HOST в .env
HOST=your-domain.com
DEBUG=False
APP_ENV=production
```

## Структура проекта

```
FinProject/
├── src/                      # Backend код
│   ├── api/v1/              # API endpoints
│   ├── core/                # Конфигурация, middleware
│   ├── models/              # SQLAlchemy модели
│   ├── services/            # Бизнес-логика
│   └── repositories/        # Доступ к данным
├── client/                  # Frontend код
│   ├── scripts/             # JavaScript модули
│   ├── styles/              # CSS стили
│   ├── pages/               # HTML страницы
│   └── Dockerfile           # Frontend контейнер
├── sql/init/                # SQL инициализация
├── nginx/                   # Nginx конфигурация
├── memory-bank/             # Документация проекта
├── .env                     # Переменные окружения
├── docker-compose.yml       # Оркестрация
├── requirements.txt         # Python зависимости
├── Dockerfile              # Backend контейнер
└── entrypoint.sh           # Startup скрипт
```

## Настройка разработки

### Требования
- Docker Desktop 4.0+
- Git
- Современный браузер (Chrome 90+, Firefox 88+)

### Быстрый старт
```bash
git clone <repository>
cd FinProject
docker-compose up -d
# Открыть http://localhost
```

### Локальная разработка без Docker
```bash
# Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd client
npm install -g http-server
http-server . -p 3000
```

## Конфигурация

### Переменные окружения (.env)
```bash
# Основные
HOST=localhost                    # ИЗМЕНИТЬ для продакшна
PORT=8000
DEBUG=True                       # False для продакшна

# Безопасность
SECRET_KEY=your_secure_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=11520

# База данных
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Akrawer1
FINANCE_DB=finance_db
USERS_DB=users_db

# Redis
REDIS_DB=0
REDIS_DEFAULT_TIMEOUT=5

# CORS (ВАЖНО для продакшна!)
CORS_ORIGINS=http://${HOST}:3000,http://${HOST}:8080
```

### Docker конфигурация
```yaml
# docker-compose.yml
services:
  nginx:    # Порт 80 (единственный внешний)
  app:      # Backend FastAPI
  frontend: # Frontend статика  
  finance_db: # PostgreSQL финансы
  users_db:   # PostgreSQL пользователи
  redis:      # Кэш и сессии
  pgadmin:    # Админка БД (порт 5050)
```

## API Документация

### Доступ к документации
- **Swagger UI**: `http://localhost/api/v1/docs`
- **ReDoc**: `http://localhost/api/v1/redoc`
- **OpenAPI JSON**: `http://localhost/api/v1/openapi.json`

### Основные эндпоинты
```
Authentication:
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

Finance API:
GET  /api/v1/finance/metrics
POST /api/v1/finance/metrics
GET  /api/v1/finance/analytics/metrics/details/{category}/{store}/{year}
POST /api/v1/finance/plan-values/distribute-yearly
POST /api/v1/finance/actual-values/with-period

Admin:
GET  /api/v1/finance/periods/years
POST /api/v1/finance/periods/years/{year}/init
```

## База данных

### Схема finance_db
```sql
-- Основные таблицы
categories          # Категории расходов
shops              # Магазины
metrics            # Метрики
periods            # Временные периоды
plan_values        # Плановые значения
actual_values      # Фактические значения
icons              # SVG иконки
```

### Схема users_db
```sql
-- Пользователи и авторизация
users              # Пользователи
roles              # Роли (admin, manager, user)
user_sessions      # Сессии
```

## Производительность

### Backend оптимизации
- Async SQLAlchemy для неблокирующих запросов
- Connection pooling для БД
- Redis кэширование сессий
- Lazy loading для связанных данных

### Frontend оптимизации
- ES6 модули (нативная поддержка)
- Минимальные HTTP запросы
- Кэширование отключено для dev (включается в prod)
- Относительные пути для CDN готовности

### Database оптимизации
- Индексы на часто используемых полях
- Разделение БД по функциональности
- Health checks для мониторинга

## Безопасность

### Аутентификация
- JWT токены с истечением срока
- Refresh токены для продления сессий
- bcrypt хеширование паролей
- Rate limiting на авторизацию

### CORS и headers
- Настраиваемые CORS origins
- Security headers через middleware
- HTTPS ready (изменить AUTH_COOKIE_SECURE=true)

### Развертывание
- Секреты через переменные окружения
- Изолированная Docker сеть
- Минимальные права контейнеров
- Health checks для всех сервисов

## Мониторинг и отладка

### Логирование
```python
# Структурированные логи
logger.info("Starting application...")
logger.error(f"Database error: {error}")
```

### Health Checks
```bash
# Проверка состояния сервисов
docker-compose ps
curl http://localhost/api/v1/
```

### Отладка
- FastAPI автоматический reload в dev
- Подробные трейсбеки при DEBUG=True
- pgAdmin для работы с БД
- Browser DevTools для frontend 
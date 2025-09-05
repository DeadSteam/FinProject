# Технический контекст PriFin

## Technology Stack

### Backend
- **Python 3.11+** - основной язык
- **FastAPI** - веб-фреймворк с async поддержкой
- **SQLAlchemy 2.0** - ORM с async support
- **Pydantic v2** - валидация данных и настройки
- **Alembic** - миграции БД
- **Redis** - кэширование и сессии

### Database
- **PostgreSQL 15** - основная БД
- **Psycopg** - драйвер для async подключений
- **Разделенные БД**: finance_db + users_db

### Frontend (текущий)
- **Vanilla JavaScript** - ES6+ modules
- **HTTP-server** - статический сервер
- **CSS3** - нативные стили без препроцессоров

### Frontend (новый)
- **React 18** - компонентная библиотека
- **React Router 6** - маршрутизация
- **Webpack 5** - сборка и dev server
- **Babel** - транспиляция ES6+
- **CSS Modules** - изолированные стили

### Infrastructure
- **Docker + Docker Compose** - контейнеризация
- **Nginx** - reverse proxy и статика
- **Linux containers** - production окружение

## Development Environment

### Зависимости Python
```txt
fastapi>=0.104.0
sqlalchemy>=2.0.0
pydantic>=2.4.0
alembic>=1.12.0
redis>=5.0.0
psycopg[binary,pool]>=3.1.0
```

### Node.js зависимости (React)
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0", 
  "react-router-dom": "^6.8.1",
  "webpack": "^5.76.0"
}
```

## Build & Deploy

### Структура контейнеров
```yaml
services:
  app:        # FastAPI backend
  frontend:   # Client (текущий vanilla JS)
  nginx:      # Reverse proxy
  finance_db: # PostgreSQL финансы
  users_db:   # PostgreSQL пользователи
  redis:      # Кэширование
```

### Environment Variables
- `HOST` - основной хост (localhost/domain)
- `SECRET_KEY` - JWT подпись
- `POSTGRES_*` - настройки БД
- `REDIS_*` - настройки кэша
- `CORS_ORIGINS` - разрешенные origins

### Порты и сервисы
- **80** - Nginx (главный вход)
- **8000** - FastAPI backend
- **3000** - Frontend dev server
- **5432** - PostgreSQL (internal)
- **6379** - Redis (internal)
- **5050** - PgAdmin (опционально)

## Development Workflow

### Локальная разработка
```bash
# Backend разработка
python main.py  # dev сервер на 8000

# Frontend разработка (старый)
cd client && npm start  # http-server на 3000

# Frontend разработка (новый React)
cd frontend && npm start  # webpack-dev-server на 3001
```

### Production деплой
```bash
# Единая команда для деплоя
docker-compose up -d
```

## Конфигурационные файлы

### Ключевые файлы
- `docker-compose.yml` - оркестрация сервисов
- `.env` - переменные окружения
- `requirements.txt` - Python зависимости
- `nginx/nginx.conf` - прокси конфигурация
- `entrypoint.sh` - startup script

### Frontend конфигурации
- `client/package.json` - vanilla JS версия
- `frontend/package.json` - React версия
- `frontend/webpack.config.js` - сборка React
- `frontend/babel.config.js` - транспиляция

## Constraints и ограничения

### Технические ограничения
- PostgreSQL только (не MySQL/SQLite)
- Redis обязателен для сессий
- Docker требуется для production

### Архитектурные решения
- Stateless backend для масштабирования
- JWT вместо server-side сессий
- Separated databases для безопасности
- API-first подход для расширяемости 
 
 
 
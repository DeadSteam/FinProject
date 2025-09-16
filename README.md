# Finance API Project

Финансовая система для управления и анализа финансовых данных с веб-интерфейсом и REST API.

## Описание проекта

Это комплексная финансовая система, состоящая из:
- **Backend**: FastAPI приложение с PostgreSQL базой данных
- **Frontend**: React приложение с современным UI
- **Infrastructure**: Docker контейнеризация с Nginx reverse proxy
- **Features**: Аналитика, отчеты, графики, экспорт данных

## Архитектура

### Backend (Python/FastAPI)
- RESTful API с OpenAPI документацией
- Аутентификация через JWT токены
- Двухбазовая архитектура (finance_db + users_db)
- Redis для кэширования и сессий
- Асинхронная обработка запросов

### Frontend (React)
- Современный React 18 с хуками
- AG Charts для финансовых графиков
- Bootstrap для UI компонентов
- Модульная архитектура с SOLID принципами
- Адаптивный дизайн

### Infrastructure
- Docker Compose для оркестрации
- Nginx как reverse proxy
- PostgreSQL для данных
- Redis для кэширования

## Как запустить

### Предварительные требования
- Docker и Docker Compose
- Git

### Быстрый старт

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd FinProject
```

2. **Настройте переменные окружения:**
```bash
# Скопируйте .env файл (уже настроен для разработки)
cp .env.example .env  # если есть
```

3. **Запустите проект:**
```bash
docker-compose up -d
```

4. **Доступ к приложению:**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Настройка для продакшна

Для развертывания в продакшне измените в `.env`:
```bash
HOST=your-domain.com
APP_ENV=production
DEBUG=False
```

## Как тестировать

### Backend тесты
```bash
# Запуск тестов в контейнере
docker-compose exec app python -m pytest

# Запуск конкретного теста
docker-compose exec app python -m pytest tests/test_main.py

# Запуск с покрытием
docker-compose exec app python -m pytest --cov=src
```

### Frontend тесты
```bash
# Переход в директорию frontend
cd frontend

# Установка зависимостей
npm install

# Запуск тестов
npm test

# Запуск конкретного теста
npm test -- --testPathPattern=components

# Запуск с покрытием
npm run test:coverage
```

### Интеграционные тесты
```bash
# Запуск всех тестов
docker-compose exec app python -m pytest tests/

# Тестирование API
curl http://localhost:8000/api/v1/health
```

## Структура проекта

```
FinProject/
├── src/                    # Backend (FastAPI)
│   ├── api/               # API endpoints
│   ├── core/              # Конфигурация и middleware
│   ├── model/             # SQLAlchemy модели
│   ├── repository/        # Репозитории данных
│   ├── service/           # Бизнес-логика
│   └── scheme/            # Pydantic схемы
├── frontend/              # Frontend (React)
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── hooks/         # Custom хуки
│   │   ├── services/      # API клиенты
│   │   └── utils/         # Утилиты
│   └── package.json
├── nginx/                 # Nginx конфигурация
├── sql/init/              # SQL инициализация
├── docker-compose.yml     # Docker оркестрация
├── .env                   # Переменные окружения
└── README.md
```

## Основные функции

### Аналитика
- Анализ финансовых показателей
- Сравнение планов и фактов
- Трендовый анализ
- Группировка по категориям и магазинам

### Отчеты
- Генерация финансовых отчетов
- Экспорт в PDF, PowerPoint, Excel
- Настраиваемые шаблоны отчетов
- Автоматическое обновление данных

### Управление данными
- CRUD операции для всех сущностей
- Валидация данных
- Конфликт-резолюция
- Версионирование изменений

### Безопасность
- JWT аутентификация
- Ролевая модель доступа
- Rate limiting
- CORS защита

## API Documentation

Полная документация API доступна по адресу:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Мониторинг и логи

```bash
# Просмотр логов всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f app
docker-compose logs -f frontend

# Статус сервисов
docker-compose ps
```

## Разработка

### Backend разработка
```bash
# Установка зависимостей локально
pip install -r requirements.txt

# Запуск в режиме разработки
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend разработка
```bash
cd frontend
npm install
npm start
```

## Troubleshooting

### Частые проблемы

1. **Порт уже используется:**
```bash
# Проверьте, что порты свободны
netstat -tulpn | grep :80
netstat -tulpn | grep :8000
```

2. **Проблемы с базой данных:**
```bash
# Пересоздание БД
docker-compose down -v
docker-compose up -d
```

3. **Проблемы с кэшем:**
```bash
# Очистка кэша Redis
docker-compose exec redis redis-cli FLUSHALL
```

## Лицензия

MIT License

## Поддержка

Для вопросов и поддержки обращайтесь к команде разработки.


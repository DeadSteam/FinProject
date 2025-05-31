FROM python:3.11-slim as builder

# Установка зависимостей для сборки
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем только файлы зависимостей
COPY requirements.txt .

# Устанавливаем зависимости в виртуальное окружение
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim

# Установка netcat и PostgreSQL клиента для проверки доступности сервисов
RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-traditional \
    postgresql-client \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем виртуальное окружение из builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Копируем код приложения
COPY . .

# Исправляем переносы строк и устанавливаем права для entrypoint скрипта
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh

# Определяем порт
EXPOSE 8000

# Команда для запуска приложения
CMD ["./entrypoint.sh"] 
#!/bin/bash
set -e

# Функция для проверки доступности PostgreSQL
wait_for_postgres() {
    host="$1"
    port="$2"
    echo "Waiting for PostgreSQL at $host:$port..."
    while ! nc -z $host $port; do
        sleep 1
    done
    echo "PostgreSQL at $host:$port is available"
}

# Функция для проверки доступности Redis
wait_for_redis() {
    host="$1"
    port="$2"
    echo "Waiting for Redis at $host:$port..."
    while ! nc -z $host $port; do
        sleep 1
    done
    echo "Redis at $host:$port is available"
}

# Функция для проверки инициализации базы данных users
wait_for_users_db_init() {
    host="$1"
    port="$2"
    db="$3"
    user="$4"
    password="$5"
    echo "Waiting for users database initialization at $host:$port/$db..."
    
    while ! PGPASSWORD=$password psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1 FROM roles LIMIT 1" > /dev/null 2>&1; do
        echo "Users database is not ready yet..."
        sleep 2
    done
    echo "Users database is initialized and ready"
}

# Функция для проверки инициализации базы данных finance
wait_for_finance_db_init() {
    host="$1"
    port="$2"
    db="$3"
    user="$4"
    password="$5"
    echo "Waiting for finance database initialization at $host:$port/$db..."
    
    while ! PGPASSWORD=$password psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1" > /dev/null 2>&1; do
        echo "Finance database is not ready yet..."
        sleep 2
    done
    echo "Finance database is initialized and ready"
}

# Установка PostgreSQL клиента
echo "Installing PostgreSQL client..."
apt-get update && apt-get install -y postgresql-client

# Ожидаем доступность всех сервисов
wait_for_postgres ${FINANCE_DB_HOST:-finance_db} ${FINANCE_PORT:-5432}
wait_for_postgres ${USERS_DB_HOST:-users_db} ${USERS_PORT:-5432}
wait_for_redis ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}

# Ожидаем инициализацию баз данных
wait_for_users_db_init ${USERS_DB_HOST:-users_db} ${USERS_PORT:-5432} ${USERS_DB:-users_db} ${POSTGRES_USER:-postgres} ${POSTGRES_PASSWORD}
wait_for_finance_db_init ${FINANCE_DB_HOST:-finance_db} ${FINANCE_PORT:-5432} ${FINANCE_DB:-finance_db} ${POSTGRES_USER:-postgres} ${POSTGRES_PASSWORD}

# Запуск приложения
echo "Starting application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload 
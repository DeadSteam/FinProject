#!/bin/bash
set -e

# Ожидаем доступность баз данных
echo "Waiting for databases to be available..."
sleep 5

# Запуск приложения
echo "Starting application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload 
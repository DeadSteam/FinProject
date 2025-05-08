FROM python:3.11-slim

WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода приложения
COPY . .

# Настройка прав для entrypoint скрипта
RUN chmod +x entrypoint.sh

# Команда для запуска приложения
CMD ["./entrypoint.sh"] 
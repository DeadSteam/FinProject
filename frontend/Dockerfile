# Multi-stage Dockerfile для React Frontend
# Поддерживает production сборку и development режим

# Базовый этап с Node.js
FROM node:18-alpine AS base
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Development этап
FROM base AS development
# Устанавливаем все зависимости (включая dev)
RUN npm ci
# Копируем весь исходный код
COPY . .
# Открываем порт dev-сервера
EXPOSE 3000
# Команда для запуска dev-сервера
CMD ["npm", "run", "dev"]

# Production build этап
FROM base AS build
# Отключаем husky в Docker (не нужны Git hooks в контейнере)
ENV HUSKY=0
# Устанавливаем ВСЕ зависимости (для сборки нужны devDependencies)
RUN npm ci --silent
# Копируем исходный код
COPY . .
# Собираем production build
RUN npm run build

# Production runtime этап
FROM nginx:alpine AS production
# Копируем custom nginx конфигурацию
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаем директорию для логов
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log && \
    touch /var/log/nginx/error.log && \
    chmod 777 /var/log/nginx/access.log && \
    chmod 777 /var/log/nginx/error.log

# Копируем собранные файлы
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем config.js в корневую директорию веб-сервера
# Это позволит легко заменять его в runtime при необходимости
COPY public/config.js /usr/share/nginx/html/config.js

# Открываем порт nginx
EXPOSE 80

# Nginx запускается автоматически
CMD ["nginx", "-g", "daemon off;"] 
 
 
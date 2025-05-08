@echo off
echo Создание новой миграции Alembic

set /p message="Введите сообщение для миграции: "

echo Создание миграции: %message%
alembic revision --autogenerate -m "%message%"

echo.
echo Миграция создана. Для применения выполните:
echo alembic upgrade head
echo.

pause 
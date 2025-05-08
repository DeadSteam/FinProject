@echo off
echo Применение миграции Alembic

echo Применение последней миграции...
alembic upgrade head

echo.
echo Миграция применена.
echo.

pause 
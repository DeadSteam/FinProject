-- Миграция: Добавление поля phone_number в таблицу users
-- Файл: 001_add_phone_number_to_users.sql
-- Дата: Создана с помощью автоматического скрипта

-- Создаем транзакцию для безопасного применения изменений
BEGIN;

-- Добавляем поле phone_number в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Создаем индекс для быстрого поиска по номеру телефона
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Добавляем комментарий к новому полю
COMMENT ON COLUMN users.phone_number IS 'Номер телефона пользователя в формате международного стандарта';

-- Подтверждаем транзакцию
COMMIT;

-- Откат миграции, если что-то пойдет не так
-- Для отката выполните следующую команду:
/*
BEGIN;
DROP INDEX IF EXISTS idx_users_phone_number;
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
COMMIT;
*/ 
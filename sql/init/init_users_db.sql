-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Таблица ролей пользователей
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    role_id UUID REFERENCES roles(id),
    status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для хранения аватаров пользователей
CREATE TABLE user_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_data BYTEA NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_user_avatars_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
);

-- Создание триггера для деактивации предыдущих аватаров пользователя при добавлении нового активного аватара
CREATE OR REPLACE FUNCTION deactivate_previous_avatars()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        UPDATE user_avatars
        SET is_active = FALSE
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deactivate_previous_avatars
AFTER INSERT OR UPDATE ON user_avatars
FOR EACH ROW
WHEN (NEW.is_active = TRUE)
EXECUTE FUNCTION deactivate_previous_avatars();

-- Вставляем базовые роли
INSERT INTO roles (name) VALUES
    ('admin'),
    ('manager'),
    ('user');

-- Создаем индексы для оптимизации запросов
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);CREATE INDEX idx_user_avatars_user_id ON user_avatars (user_id);
CREATE INDEX idx_user_avatars_is_active ON user_avatars (is_active);

-- Добавление комментариев к таблице и полям
COMMENT ON TABLE user_avatars IS 'Таблица для хранения аватаров пользователей';
COMMENT ON COLUMN user_avatars.id IS 'Уникальный идентификатор аватара';
COMMENT ON COLUMN user_avatars.user_id IS 'Идентификатор пользователя';
COMMENT ON COLUMN user_avatars.filename IS 'Имя файла аватара';
COMMENT ON COLUMN user_avatars.content_type IS 'MIME-тип содержимого файла';
COMMENT ON COLUMN user_avatars.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN user_avatars.file_data IS 'Бинарные данные файла';
COMMENT ON COLUMN user_avatars.uploaded_at IS 'Дата и время загрузки аватара';
COMMENT ON COLUMN user_avatars.is_active IS 'Флаг активности аватара (у пользователя может быть только один активный аватар)';

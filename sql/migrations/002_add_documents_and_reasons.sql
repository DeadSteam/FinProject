-- Миграция для добавления таблицы документов и полей причин отклонения

-- Подключение к базе данных finance_db
\c finance_db;

-- Добавление полей причин отклонения в таблицу actual_values
ALTER TABLE actual_values 
ADD COLUMN reason TEXT DEFAULT NULL,
ADD COLUMN reason_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Создание таблицы для хранения документов
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actual_value_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_data BYTEA NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    uploaded_by UUID DEFAULT NULL,
    status BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_documents_actual_value FOREIGN KEY (actual_value_id)
        REFERENCES actual_values (id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_user FOREIGN KEY (uploaded_by)
        REFERENCES users_db.users (id) ON DELETE SET NULL
);

-- Создание индексов для ускорения поиска
CREATE INDEX idx_documents_actual_value_id ON documents (actual_value_id);
CREATE INDEX idx_documents_uploaded_by ON documents (uploaded_by);
CREATE INDEX idx_documents_status ON documents (status);

-- Добавление комментариев к таблице и полям
COMMENT ON TABLE documents IS 'Таблица для хранения документов, связанных с фактическими значениями';
COMMENT ON COLUMN documents.id IS 'Уникальный идентификатор документа';
COMMENT ON COLUMN documents.actual_value_id IS 'Идентификатор связанного фактического значения';
COMMENT ON COLUMN documents.filename IS 'Имя файла документа';
COMMENT ON COLUMN documents.content_type IS 'MIME-тип содержимого файла';
COMMENT ON COLUMN documents.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN documents.file_data IS 'Бинарные данные файла';
COMMENT ON COLUMN documents.uploaded_at IS 'Дата и время загрузки документа';
COMMENT ON COLUMN documents.uploaded_by IS 'Идентификатор пользователя, загрузившего документ';
COMMENT ON COLUMN documents.status IS 'Статус документа (активен/удален)';

COMMENT ON COLUMN actual_values.reason IS 'Причина отклонения фактического значения от плана';
COMMENT ON COLUMN actual_values.reason_updated_at IS 'Дата и время обновления причины отклонения';

-- Создание триггера для автоматического обновления reason_updated_at при изменении reason
CREATE OR REPLACE FUNCTION update_reason_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.reason IS DISTINCT FROM NEW.reason THEN
        NEW.reason_updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reason_updated_at
BEFORE UPDATE ON actual_values
FOR EACH ROW
WHEN (OLD.reason IS DISTINCT FROM NEW.reason)
EXECUTE FUNCTION update_reason_updated_at(); 
 
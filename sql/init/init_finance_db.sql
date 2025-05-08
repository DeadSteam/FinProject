-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица для временных периодов: год, квартал, месяц
CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL,
    quarter INT CHECK (quarter BETWEEN 1 AND 4),
    month INT CHECK (month BETWEEN 1 AND 12),
    UNIQUE(year, quarter, month)
);

-- Таблица для хранения SVG-изображений
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    svg_data TEXT NOT NULL
);

-- Таблица для категорий расходов с полем description и image_id
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_id UUID REFERENCES images(id),
    status BOOLEAN NOT NULL DEFAULT TRUE
);

-- Таблица для магазинов с полем description
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    number_of_staff INT NOT NULL,
    description TEXT,
    address VARCHAR(500),
    status BOOLEAN NOT NULL DEFAULT TRUE
);

-- Таблица для метрик, связанных с категориями
CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    unit VARCHAR(50) NOT NULL DEFAULT 'Руб.'
);

-- Функция для проверки, является ли период месячным
CREATE OR REPLACE FUNCTION is_monthly_period(p_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM periods WHERE id = p_id AND month IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Таблица для фактических расходов, только для месячных периодов
CREATE TABLE actual_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    value NUMERIC(12, 2) NOT NULL,
    period_id UUID NOT NULL REFERENCES periods(id),
    CONSTRAINT check_monthly_period CHECK (is_monthly_period(period_id)),
    CONSTRAINT unique_actual_metric_shop_period UNIQUE (metric_id, shop_id, period_id)
);

-- Таблица для плановых расходов, для любого типа периода
CREATE TABLE plan_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES periods(id),
    value NUMERIC(12, 2) NOT NULL,
    CONSTRAINT unique_plan_metric_shop_period UNIQUE (metric_id, shop_id, period_id)
);

CREATE INDEX idx_categories_status ON categories(status);
CREATE INDEX idx_shops_status ON shops(status);
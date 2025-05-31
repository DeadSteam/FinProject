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

-- Заполняем таблицу images SVG-иконками для категорий с конкретными UUID
INSERT INTO images (id, name, svg_data) VALUES 
('de30bfb3-aa06-4e13-b0f6-8b5b8f9901c2', 'home', 'M12 2L3 9v12h18V9l-9-7zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z'),
('a3e4d98a-60d6-48e5-9762-3e3a6183bcc7', 'figure', 'M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'),
('3558cf0f-dcb3-4b3e-ad52-eb937af04423', 'microphone', 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V20h4v2H8v-2h4v-4.07z'),
('183f286f-27e7-47d6-8950-bab733a3964a', 'bag', 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4 12h-4v4h-2v-4H7v-2h4V9h2v4h4v2z');

-- Заполняем таблицу categories базовыми категориями расходов
INSERT INTO categories (name, description, image_id, status) VALUES 
('Зарплата', 'Ежемесячные расходы на зарплаты', 'de30bfb3-aa06-4e13-b0f6-8b5b8f9901c2', true),
('Услуги контрагентов', 'Затраты на получаемые услуги от контрагентов', 'a3e4d98a-60d6-48e5-9762-3e3a6183bcc7', true),
('Содержание магазина', 'Расходы на техническое обслуживание', '183f286f-27e7-47d6-8950-bab733a3964a', true),
('Сырье', 'Расходы на закупку сырья', '3558cf0f-dcb3-4b3e-ad52-eb937af04423', true);

-- Инициализация 2025 года
-- Создаем период для года 2025
INSERT INTO periods (year, quarter, month) VALUES (2025, NULL, NULL);

-- Создаем периоды для кварталов 2025 года
INSERT INTO periods (year, quarter, month) VALUES 
(2025, 1, NULL),
(2025, 2, NULL),
(2025, 3, NULL),
(2025, 4, NULL);

-- Создаем периоды для месяцев 2025 года
INSERT INTO periods (year, quarter, month) VALUES 
-- Q1 2025
(2025, 1, 1),
(2025, 1, 2),
(2025, 1, 3),
-- Q2 2025
(2025, 2, 4),
(2025, 2, 5),
(2025, 2, 6),
-- Q3 2025
(2025, 3, 7),
(2025, 3, 8),
(2025, 3, 9),
-- Q4 2025
(2025, 4, 10),
(2025, 4, 11),
(2025, 4, 12);
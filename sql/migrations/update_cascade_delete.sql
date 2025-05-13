-- Скрипт для обновления ограничений внешних ключей с добавлением каскадного удаления

-- Обновление внешних ключей в таблице actual_values
ALTER TABLE actual_values DROP CONSTRAINT actual_values_metric_id_fkey;
ALTER TABLE actual_values ADD CONSTRAINT actual_values_metric_id_fkey
    FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE;

ALTER TABLE actual_values DROP CONSTRAINT actual_values_shop_id_fkey;
ALTER TABLE actual_values ADD CONSTRAINT actual_values_shop_id_fkey
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Обновление внешних ключей в таблице plan_values
ALTER TABLE plan_values DROP CONSTRAINT plan_values_metric_id_fkey;
ALTER TABLE plan_values ADD CONSTRAINT plan_values_metric_id_fkey
    FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE;

ALTER TABLE plan_values DROP CONSTRAINT plan_values_shop_id_fkey;
ALTER TABLE plan_values ADD CONSTRAINT plan_values_shop_id_fkey
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;

-- Проверка успешности операции
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('actual_values', 'plan_values')
    AND kcu.column_name IN ('metric_id', 'shop_id')
ORDER BY 
    tc.table_name,
    kcu.column_name; 
/**
 * Утилита для нормализации состояния данных по ID
 * Преобразует массивы данных в структуру {entities, ids} для оптимальной производительности
 */

/**
 * Нормализует массив данных в структуру с индексированием по ID
 * 
 * @param {Array} data - Массив данных для нормализации
 * @param {string} idField - Поле, содержащее уникальный идентификатор (по умолчанию 'id')
 * @returns {Object} Нормализованная структура {entities, ids}
 */
export function normalizeData(data, idField = 'id') {
    if (!Array.isArray(data)) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('normalizeData: expected array, got:', typeof data);
        }
        return { entities: {}, ids: [] };
    }
    
    const entities = {};
    const ids = [];
    
    data.forEach(item => {
        if (item && item[idField] != null) {
            const id = item[idField];
            entities[id] = item;
            if (!ids.includes(id)) {
                ids.push(id);
            }
        }
    });
    
    return { entities, ids };
}

/**
 * Денормализует структуру обратно в массив
 * 
 * @param {Object} normalizedData - Нормализованные данные {entities, ids}
 * @returns {Array} Массив денормализованных данных
 */
export function denormalizeData(normalizedData) {
    if (!normalizedData || !normalizedData.entities || !normalizedData.ids) {
        return [];
    }
    
    const { entities, ids } = normalizedData;
    return ids.map(id => entities[id]).filter(Boolean);
}

/**
 * Добавляет элемент в нормализованную структуру
 * 
 * @param {Object} normalizedData - Текущие нормализованные данные
 * @param {Object} item - Новый элемент для добавления
 * @param {string} idField - Поле ID
 * @returns {Object} Обновленная нормализованная структура
 */
export function addToNormalized(normalizedData, item, idField = 'id') {
    if (!item || item[idField] == null) {
        return normalizedData;
    }
    
    const id = item[idField];
    const { entities, ids } = normalizedData;
    
    return {
        entities: {
            ...entities,
            [id]: item
        },
        ids: ids.includes(id) ? ids : [...ids, id]
    };
}

/**
 * Обновляет элемент в нормализованной структуре
 * 
 * @param {Object} normalizedData - Текущие нормализованные данные
 * @param {string|number} id - ID элемента для обновления
 * @param {Object} updates - Обновления для применения
 * @returns {Object} Обновленная нормализованная структура
 */
export function updateInNormalized(normalizedData, id, updates) {
    const { entities, ids } = normalizedData;
    
    if (!entities[id]) {
        return normalizedData;
    }
    
    return {
        entities: {
            ...entities,
            [id]: {
                ...entities[id],
                ...updates
            }
        },
        ids
    };
}

/**
 * Удаляет элемент из нормализованной структуры
 * 
 * @param {Object} normalizedData - Текущие нормализованные данные
 * @param {string|number} id - ID элемента для удаления
 * @returns {Object} Обновленная нормализованная структура
 */
export function removeFromNormalized(normalizedData, id) {
    const { entities, ids } = normalizedData;
    
    if (!entities[id]) {
        return normalizedData;
    }
    
    const newEntities = { ...entities };
    delete newEntities[id];
    
    return {
        entities: newEntities,
        ids: ids.filter(existingId => existingId !== id)
    };
}

/**
 * Обновляет множественные элементы в нормализованной структуре
 * 
 * @param {Object} normalizedData - Текущие нормализованные данные
 * @param {Array} updates - Массив обновлений [{id, updates}, ...]
 * @returns {Object} Обновленная нормализованная структура
 */
export function batchUpdateNormalized(normalizedData, updates) {
    if (!Array.isArray(updates)) {
        return normalizedData;
    }
    
    const { entities, ids } = normalizedData;
    const newEntities = { ...entities };
    
    updates.forEach(({ id, updates: itemUpdates }) => {
        if (newEntities[id]) {
            newEntities[id] = {
                ...newEntities[id],
                ...itemUpdates
            };
        }
    });
    
    return {
        entities: newEntities,
        ids
    };
}

/**
 * Объединяет две нормализованные структуры
 * 
 * @param {Object} target - Целевая структура
 * @param {Object} source - Исходная структура для объединения
 * @returns {Object} Объединенная нормализованная структура
 */
export function mergeNormalized(target, source) {
    if (!source || !source.entities || !source.ids) {
        return target;
    }
    
    if (!target || !target.entities || !target.ids) {
        return source;
    }
    
    const mergedEntities = {
        ...target.entities,
        ...source.entities
    };
    
    const mergedIds = [...new Set([...target.ids, ...source.ids])];
    
    return {
        entities: mergedEntities,
        ids: mergedIds
    };
}

/**
 * Фильтрует нормализованные данные
 * 
 * @param {Object} normalizedData - Нормализованные данные
 * @param {Function} predicate - Функция фильтрации
 * @returns {Object} Отфильтрованная нормализованная структура
 */
export function filterNormalized(normalizedData, predicate) {
    if (!normalizedData || !normalizedData.entities || !normalizedData.ids) {
        return { entities: {}, ids: [] };
    }
    
    const { entities, ids } = normalizedData;
    const filteredEntities = {};
    const filteredIds = [];
    
    ids.forEach(id => {
        const entity = entities[id];
        if (entity && predicate(entity)) {
            filteredEntities[id] = entity;
            filteredIds.push(id);
        }
    });
    
    return {
        entities: filteredEntities,
        ids: filteredIds
    };
}

/**
 * Сортирует нормализованные данные
 * 
 * @param {Object} normalizedData - Нормализованные данные
 * @param {Function} compareFn - Функция сравнения
 * @returns {Object} Отсортированная нормализованная структура
 */
export function sortNormalized(normalizedData, compareFn) {
    if (!normalizedData || !normalizedData.entities || !normalizedData.ids) {
        return { entities: {}, ids: [] };
    }
    
    const { entities, ids } = normalizedData;
    const sortedIds = [...ids].sort((idA, idB) => {
        const entityA = entities[idA];
        const entityB = entities[idB];
        return compareFn(entityA, entityB);
    });
    
    return {
        entities,
        ids: sortedIds
    };
}

/**
 * Группирует нормализованные данные по полю
 * 
 * @param {Object} normalizedData - Нормализованные данные
 * @param {string|Function} groupBy - Поле или функция для группировки
 * @returns {Object} Сгруппированные данные {groupKey: {entities, ids}}
 */
export function groupNormalized(normalizedData, groupBy) {
    if (!normalizedData || !normalizedData.entities || !normalizedData.ids) {
        return {};
    }
    
    const { entities, ids } = normalizedData;
    const groups = {};
    
    ids.forEach(id => {
        const entity = entities[id];
        if (!entity) return;
        
        const groupKey = typeof groupBy === 'function' 
            ? groupBy(entity) 
            : entity[groupBy];
            
        if (!groups[groupKey]) {
            groups[groupKey] = { entities: {}, ids: [] };
        }
        
        groups[groupKey].entities[id] = entity;
        groups[groupKey].ids.push(id);
    });
    
    return groups;
}

/**
 * Создает селектор для получения элемента по ID из нормализованных данных
 * 
 * @param {Object} normalizedData - Нормализованные данные
 * @returns {Function} Селектор функция
 */
export function createByIdSelector(normalizedData) {
    return (id) => {
        if (!normalizedData || !normalizedData.entities) {
            return null;
        }
        return normalizedData.entities[id] || null;
    };
}

/**
 * Создает селектор для получения всех элементов из нормализованных данных
 * 
 * @param {Object} normalizedData - Нормализованные данные
 * @returns {Function} Селектор функция
 */
export function createAllSelector(normalizedData) {
    return () => denormalizeData(normalizedData);
}

/**
 * Создает селектор для получения количества элементов
 * 
 * @param {Object} normalizedData - Нормализованные данные
 * @returns {Function} Селектор функция
 */
export function createCountSelector(normalizedData) {
    return () => {
        if (!normalizedData || !normalizedData.ids) {
            return 0;
        }
        return normalizedData.ids.length;
    };
}

/**
 * Утилиты для работы с связанными данными
 */

/**
 * Связывает нормализованные данные по внешнему ключу
 * 
 * @param {Object} primary - Основные данные
 * @param {Object} related - Связанные данные
 * @param {string} foreignKey - Внешний ключ в основных данных
 * @param {string} relatedField - Поле для добавления связанных данных
 * @returns {Object} Данные с добавленными связями
 */
export function linkNormalizedData(primary, related, foreignKey, relatedField = 'related') {
    if (!primary || !related) {
        return primary;
    }
    
    const { entities: primaryEntities, ids: primaryIds } = primary;
    const { entities: relatedEntities } = related;
    
    const linkedEntities = {};
    
    primaryIds.forEach(id => {
        const entity = primaryEntities[id];
        if (entity) {
            const relatedId = entity[foreignKey];
            const relatedEntity = relatedId ? relatedEntities[relatedId] : null;
            
            linkedEntities[id] = {
                ...entity,
                [relatedField]: relatedEntity
            };
        }
    });
    
    return {
        entities: linkedEntities,
        ids: primaryIds
    };
}

/**
 * Создает нормализатор для конкретного типа данных
 * 
 * @param {string} idField - Поле ID
 * @returns {Object} Объект с методами нормализации для данного типа
 */
export function createNormalizer(idField = 'id') {
    return {
        normalize: (data) => normalizeData(data, idField),
        denormalize: denormalizeData,
        add: (normalizedData, item) => addToNormalized(normalizedData, item, idField),
        update: updateInNormalized,
        remove: removeFromNormalized,
        batchUpdate: batchUpdateNormalized,
        merge: mergeNormalized,
        filter: filterNormalized,
        sort: sortNormalized,
        group: groupNormalized,
        createByIdSelector,
        createAllSelector,
        createCountSelector
    };
}

// Предустановленные нормализаторы для частых случаев
export const usersNormalizer = createNormalizer('id');
export const categoriesNormalizer = createNormalizer('id');
export const metricsNormalizer = createNormalizer('id');
export const shopsNormalizer = createNormalizer('id');
export const periodsNormalizer = createNormalizer('id');

export default {
    normalizeData,
    denormalizeData,
    addToNormalized,
    updateInNormalized,
    removeFromNormalized,
    batchUpdateNormalized,
    mergeNormalized,
    filterNormalized,
    sortNormalized,
    groupNormalized,
    createByIdSelector,
    createAllSelector,
    createCountSelector,
    linkNormalizedData,
    createNormalizer,
    usersNormalizer,
    categoriesNormalizer,
    metricsNormalizer,
    shopsNormalizer,
    periodsNormalizer
}; 
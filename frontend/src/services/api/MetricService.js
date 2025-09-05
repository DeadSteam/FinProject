/**
 * Сервис управления метриками и планированием
 * Отвечает за CRUD операции с метриками, планами и фактическими значениями
 */
export class MetricService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    // === МЕТРИКИ ===

    /**
     * Получение списка всех метрик
     * @param {Object} filters - Фильтры для поиска
     * @returns {Promise<Array>} - Список метрик
     */
    async getMetrics(filters = {}) {
        return this.api.get('/finance/metrics', filters);
    }

    /**
     * Получение метрики по ID
     * @param {string} metricId - ID метрики
     * @returns {Promise<Object>} - Данные метрики
     */
    async getMetricById(metricId) {
        return this.api.get(`/finance/metrics/${metricId}`);
    }

    /**
     * Создание новой метрики
     * @param {Object} metricData - Данные метрики
     * @returns {Promise<Object>} - Созданная метрика
     */
    async createMetric(metricData) {
        return this.api.post('/finance/metrics', metricData);
    }

    /**
     * Обновление метрики
     * @param {string} metricId - ID метрики
     * @param {Object} metricData - Обновленные данные
     * @returns {Promise<Object>} - Обновленная метрика
     */
    async updateMetric(metricId, metricData) {
        return this.api.put(`/finance/metrics/${metricId}`, metricData);
    }

    /**
     * Удаление метрики
     * @param {string} metricId - ID метрики
     * @returns {Promise<Object>} - Результат удаления
     */
    async deleteMetric(metricId) {
        return this.api.delete(`/finance/metrics/${metricId}`);
    }

    // === ПЕРИОДЫ ===

    /**
     * Получение списка периодов
     * @param {Object} filters - Фильтры (год, квартал, месяц)
     * @returns {Promise<Array>} - Список периодов
     */
    async getPeriods(filters = {}) {
        return this.api.get('/finance/periods', filters);
    }

    /**
     * Создание нового периода
     * @param {Object} periodData - Данные периода
     * @returns {Promise<Object>} - Созданный период
     */
    async createPeriod(periodData) {
        return this.api.post('/finance/periods', periodData);
    }

    /**
     * Инициализация периодов для года
     * @param {number} year - Год для инициализации
     * @returns {Promise<Object>} - Результат инициализации
     */
    async initializeYear(year) {
        return this.api.post(`/finance/periods/years/${year}/init`);
    }

    // === ПЛАНОВЫЕ ЗНАЧЕНИЯ ===

    /**
     * Получение плановых значений
     * @param {Object} filters - Фильтры
     * @returns {Promise<Array>} - Плановые значения
     */
    async getPlanValues(filters = {}) {
        return this.api.get('/finance/plan-values', filters);
    }

    /**
     * Создание планового значения
     * @param {Object} planData - Данные плана
     * @returns {Promise<Object>} - Созданное плановое значение
     */
    async createPlanValue(planData) {
        return this.api.post('/finance/plan-values', planData);
    }

    /**
     * Обновление планового значения
     * @param {string} planId - ID планового значения
     * @param {Object} planData - Обновленные данные
     * @returns {Promise<Object>} - Обновленное плановое значение
     */
    async updatePlanValue(planId, planData) {
        return this.api.put(`/finance/plan-values/${planId}`, planData);
    }

    /**
     * Обновление планового значения по параметрам периода
     * @param {string} metricId - ID метрики
     * @param {string} shopId - ID магазина
     * @param {number} year - Год
     * @param {number} value - Значение
     * @param {number} month - Месяц (опционально)
     * @param {number} quarter - Квартал (опционально)
     * @returns {Promise<Object>} - Результат обновления
     */
    async updatePlanValueByPeriod(metricId, shopId, year, value, month = null, quarter = null) {
        const params = {
            metric_id: metricId,
            year,
            value
        };
        
        if (shopId) params.shop_id = shopId;
        if (month) params.month = month;
        if (quarter) params.quarter = quarter;
        
        return this.api.put('/finance/plan-values/by-period', null, { params });
    }

    /**
     * Распределение годового плана по месяцам
     * @param {string} metricId - ID метрики
     * @param {string} shopId - ID магазина
     * @param {number} year - Год
     * @param {number} yearlyValue - Годовое значение
     * @returns {Promise<Object>} - Результат распределения
     */
    async distributeYearlyPlan(metricId, shopId, year, yearlyValue) {
        const params = {
            metric_id: metricId,
            shop_id: shopId,
            year,
            yearly_value: yearlyValue
        };
        
        return this.api.post('/finance/plan-values/distribute-yearly', null, { params });
    }

    // === ФАКТИЧЕСКИЕ ЗНАЧЕНИЯ ===

    /**
     * Получение фактических значений
     * @param {Object} filters - Фильтры
     * @returns {Promise<Array>} - Фактические значения
     */
    async getActualValues(filters = {}) {
        return this.api.get('/finance/actual-values', filters);
    }

    /**
     * Создание фактического значения
     * @param {Object} actualData - Данные факта
     * @returns {Promise<Object>} - Созданное фактическое значение
     */
    async createActualValue(actualData) {
        return this.api.post('/finance/actual-values', actualData);
    }

    /**
     * Обновление фактического значения
     * @param {string} actualId - ID фактического значения
     * @param {Object} actualData - Обновленные данные
     * @returns {Promise<Object>} - Обновленное фактическое значение
     */
    async updateActualValue(actualId, actualData) {
        return this.api.put(`/finance/actual-values/${actualId}`, actualData);
    }

    /**
     * Обновление фактического значения по параметрам периода
     * @param {string} metricId - ID метрики
     * @param {string} shopId - ID магазина
     * @param {number} year - Год
     * @param {number} value - Значение
     * @param {number} month - Месяц (опционально)
     * @param {number} quarter - Квартал (опционально)
     * @returns {Promise<Object>} - Результат обновления
     */
    async updateActualValueByPeriod(metricId, shopId, year, value, month = null, quarter = null) {
        const params = {
            metric_id: metricId,
            year,
            value
        };
        
        if (shopId) params.shop_id = shopId;
        if (month) params.month = month;
        if (quarter) params.quarter = quarter;
        
        return this.api.put('/finance/actual-values/by-period', null, { params });
    }

    /**
     * Пересчет плана с учетом фактических значений
     * @param {Object} recalcData - Данные для пересчета
     * @returns {Promise<Object>} - Результат пересчета
     */
    async recalculatePlanWithActual(recalcData) {
        const params = {
            metric_id: recalcData.metric_id,
            shop_id: recalcData.shop_id,
            year: recalcData.year,
            actual_month: recalcData.actual_month,
            actual_value: recalcData.actual_value
        };
        
        return this.api.post('/finance/plan-values/recalculate-with-actual', null, { params });
    }
} 
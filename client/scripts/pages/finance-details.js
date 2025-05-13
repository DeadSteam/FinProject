// Класс для работы с API
class ApiClient {
    constructor(baseUrl = 'http://localhost:8000/api/v1') {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json'
        };
    }

    async get(endpoint) {
        try {
            console.log(`Выполняем GET запрос к ${this.baseUrl}${endpoint}`);
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: this.headers
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка GET запроса: ${error.message}`);
            throw error;
        }
    }

    async getWithParams(endpoint, params) {
        try {
            // Преобразуем объект параметров в строку запроса
            const queryParams = new URLSearchParams();
            for (const key in params) {
                // Преобразуем числовые параметры и убедимся, что они передаются как числа
                if (typeof params[key] === 'number') {
                    queryParams.append(key, params[key].toString());
                } else {
                    queryParams.append(key, params[key]);
                }
            }

            const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
            console.log(`Выполняем GET запрос с параметрами к ${url}`);

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Ошибка GET запроса с параметрами: ${error.message}`);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            console.log(`Выполняем POST запрос к ${this.baseUrl}${endpoint}`, data);
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            // Сохраняем текст ответа для отладки
            const responseText = await response.text();
            console.log(`Ответ на POST запрос (${response.status}):\n`, responseText);

            if (!response.ok) {
                // Пытаемся преобразовать ответ в JSON, если это возможно
                let errorMessage = `HTTP error! Status: ${response.status}, Response: ${responseText}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = `Ошибка сервера: ${JSON.stringify(errorData)}`;
                } catch (jsonError) {
                    console.error('Не удалось распарсить JSON ошибки:', jsonError);
                    // Если не удалось распарсить JSON, сохраняем исходный текст ошибки
                }
                throw new Error(errorMessage);
            }

            // Если ответ пустой, возвращаем пустой объект
            if (!responseText) {
                return {};
            }

            // Иначе возвращаем распарсенный JSON
            try {
                return JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Ошибка при парсинге ответа:', jsonError, 'Ответ:', responseText);
                throw new Error(`Невозможно обработать ответ сервера: ${responseText}`);
            }
        } catch (error) {
            console.error(`Ошибка POST запроса: ${error.message}`);
            throw error;
        }
    }

    async put(endpoint, data) {
        try {
            console.log(`Выполняем PUT запрос к ${this.baseUrl}${endpoint}`, data);
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            // Сохраняем ответ для отладки
            const responseText = await response.text();
            console.log(`Ответ на PUT запрос (${response.status}):\n`, responseText);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
            }

            // Если ответ пустой, возвращаем пустой объект
            if (!responseText) {
                return {};
            }

            // Иначе возвращаем распарсенный JSON
            return JSON.parse(responseText);
        } catch (error) {
            console.error(`Ошибка PUT запроса: ${error.message}`);
            throw error;
        }
    }

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.headers
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка DELETE запроса: ${error.message}`);
            throw error;
        }
    }

    async postWithParams(endpoint, params) {
        try {
            // Создаем URL с параметрами запроса
            const url = new URL(`${this.baseUrl}${endpoint}`);
            for (const key in params) {
                // Добавляем параметры в строку запроса
                url.searchParams.append(key, params[key].toString());
            }

            console.log(`Выполняем POST запрос с параметрами к ${url.toString()}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers
            });

            // Сохраняем текст ответа для отладки
            const responseText = await response.text();

            if (!response.ok) {
                // Пытаемся преобразовать ответ в JSON, если это возможно
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                    throw new Error(`Ошибка сервера: ${JSON.stringify(errorData)}`);
                } catch (jsonError) {
                    // Если не удалось распарсить JSON, возвращаем текст ошибки
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
                }
            }

            // Если ответ пустой, возвращаем пустой объект
            if (!responseText) {
                return {};
            }

            // Иначе возвращаем распарсенный JSON
            return JSON.parse(responseText);
        } catch (error) {
            console.error(`Ошибка POST запроса с параметрами: ${error.message}`);
            throw error;
        }
    }

    async putWithParams(endpoint, params) {
        try {
            // Создаем URL с параметрами запроса
            const url = new URL(`${this.baseUrl}${endpoint}`);
            for (const key in params) {
                // Добавляем параметры в строку запроса
                url.searchParams.append(key, params[key].toString());
            }

            console.log(`Выполняем PUT запрос с параметрами к ${url.toString()}`);

            const response = await fetch(url, {
                method: 'PUT',
                headers: this.headers
            });

            // Сохраняем текст ответа для отладки
            const responseText = await response.text();
            console.log(`Ответ на PUT запрос (${response.status}):\n`, responseText);

            if (!response.ok) {
                // Пытаемся преобразовать ответ в JSON, если это возможно
                let errorMessage = `HTTP error! Status: ${response.status}, Response: ${responseText}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = `Ошибка сервера: ${JSON.stringify(errorData)}`;
                } catch (jsonError) {
                    console.error('Не удалось распарсить JSON ошибки:', jsonError);
                    // Если не удалось распарсить JSON, возвращаем текст ошибки
                }
                throw new Error(errorMessage);
            }

            // Если ответ пустой, возвращаем пустой объект
            if (!responseText) {
                return {};
            }

            // Иначе возвращаем распарсенный JSON
            return JSON.parse(responseText);
        } catch (error) {
            console.error(`Ошибка PUT запроса с параметрами: ${error.message}`);
            throw error;
        }
    }
    async getActualValuesByPeriodParams(metricId, year, month = null, quarter = null) {
        const params = { metric_id: metricId, year };
        if (month !== null) params.month = month;
        if (quarter !== null) params.quarter = quarter;

        return await this.getWithParams('/finance/actual-values/by-period', params);
    }

    async createActualValueWithPeriod(data) {
        try {
            // Преобразуем объект параметров в query-параметры запроса
            const queryParams = {};
            for (const key in data) {
                // Преобразуем числовые параметры явно в строку
                if (typeof data[key] === 'number') {
                    queryParams[key] = data[key].toString();
                } else {
                    queryParams[key] = data[key];
                }
            }

            console.log('Отправляем запрос на создание фактического значения, параметры:', queryParams);

            // Используем postWithParams вместо post
            return await this.postWithParams('/finance/actual-values/with-period', queryParams);
        } catch (error) {
            console.error(`Ошибка при создании фактического значения: ${error.message}`, error);
            throw error;
        }
    }

    async updateActualValueByPeriod(metricId, shopId, year, value, month = null, quarter = null) {
        try {
            // Создаем объект параметров
            const params = {
                metric_id: metricId,
                shop_id: shopId,
                year: year.toString(),
                value: value.toString()
            };

            if (month !== null) params.month = month.toString();
            if (quarter !== null) params.quarter = quarter.toString();

            console.log('Отправляем запрос на обновление фактического значения, параметры:', params);

            // Используем putWithParams вместо postWithParams
            return await this.putWithParams('/finance/actual-values/by-period', params);
        } catch (error) {
            console.error(`Ошибка при обновлении фактического значения: ${error.message}`, error);
            throw error;
        }
    }

    async getPlanValuesByPeriodParams(metricId, year, month = null, quarter = null) {
        const params = { metric_id: metricId, year };
        if (month !== null) params.month = month;
        if (quarter !== null) params.quarter = quarter;

        return await this.getWithParams('/finance/plan-values/by-period', params);
    }

    async createPlanValueWithPeriod(data) {
        return await this.post('/finance/plan-values/with-period', data);
    }

    async updatePlanValueByPeriod(metricId, shopId, year, value, month = null, quarter = null) {
        const data = {
            metric_id: metricId,
            shop_id: shopId,
            year,
            value
        };

        if (month !== null) data.month = month;
        if (quarter !== null) data.quarter = quarter;

        return await this.put('/finance/plan-values/by-period', data);
    }

    // Добавляем новый метод в класс ApiClient для получения доступных годов
    async getAvailableYears() {
        return await this.get('/finance/periods/years');
    }

    // Добавляем новый метод в класс ApiClient для инициализации года
    async initializeYear(year) {
        return await this.post(`/finance/periods/years/${year}/init`);
    }
}

// Создаем экземпляр ApiClient
const apiClient = new ApiClient('http://localhost:8000/api/v1');

// Получение параметров из URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        categoryId: params.get('category') || '',
        storeId: params.get('store') || '',
        year: params.get('year') || ''
    };
}

// Функция форматирования чисел
function formatNumber(number) {
    // Сохраняем знак числа
    const isNegative = number < 0;
    // Форматируем абсолютное значение числа
    const formattedAbsNumber = new Intl.NumberFormat('ru-RU').format(Math.abs(number));
    // Возвращаем число со знаком, если оно отрицательное
    return isNegative ? `-${formattedAbsNumber}` : formattedAbsNumber;
}

// Функции для управления индикатором загрузки
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('visible');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('visible');
}

// Функция для создания модального окна добавления метрики
function createMetricModal() {
    const modalHtml = `
        <div class="modal" id="add-metric-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Добавить метрику</h3>
                    <button class="modal-close" id="close-metric-modal">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="metric-form">
                        <div class="form-group">
                            <label for="metric-name">Название метрики <span class="required">*</span></label>
                            <input type="text" id="metric-name" class="form-control" required placeholder="Например: Отработанные часы">
                        </div>
                        <div class="form-group">
                            <label for="metric-unit">Единица измерения <span class="required">*</span></label>
                            <input type="text" id="metric-unit" class="form-control" required placeholder="Например: ч, руб, шт">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-metric-btn">Отмена</button>
                    <button class="btn btn-primary" id="save-metric-btn">Сохранить</button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);

    // Добавляем стили для модального окна
    const modalStyles = `
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background-color: white;
            border-radius: var(--card-border-radius);
            width: 100%;
            max-width: 500px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid var(--border);
        }
        
        .modal-title {
            margin: 0;
            font-size: 1.2rem;
            color: var(--text-primary);
        }
        
        .modal-close {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
        }
        
        .modal-body {
            padding: 1rem;
        }
        
        .modal-footer {
            padding: 1rem;
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            border-top: 1px solid var(--border);
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .form-control {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border: 1px solid var(--border);
            border-radius: var(--input-border-radius);
            font-size: 1rem;
        }
        
        .required {
            color: var(--error);
        }
        
        /* Кнопки добавления */
        .action-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = modalStyles;
    document.head.appendChild(styleElement);

    // Добавляем обработчики для модального окна
    document.getElementById('close-metric-modal').addEventListener('click', () => {
        document.getElementById('add-metric-modal').classList.remove('active');
    });

    document.getElementById('cancel-metric-btn').addEventListener('click', () => {
        document.getElementById('add-metric-modal').classList.remove('active');
    });

    document.getElementById('save-metric-btn').addEventListener('click', async () => {
        const form = document.getElementById('metric-form');
        if (form.checkValidity()) {
            const metricData = {
                name: document.getElementById('metric-name').value,
                unit: document.getElementById('metric-unit').value,
                category_id: getUrlParams().categoryId,
                store_id: getUrlParams().storeId
            };

            try {
                showLoading();
                await apiClient.post('/finance/metrics', metricData);
                hideLoading();
                document.getElementById('add-metric-modal').classList.remove('active');
                
                // Обновляем таблицу метрик
                await loadMetrics();
                
                showNotification('Метрика успешно добавлена', 'success');
            } catch (error) {
                hideLoading();
                showNotification('Ошибка при добавлении метрики: ' + error.message, 'error');
            }
        } else {
            form.reportValidity();
        }
    });
}

// Функция для создания модального окна добавления фактического значения
function createFactValueModal() {
    const modalHtml = `
        <div class="modal" id="add-fact-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Добавить фактическое значение</h3>
                    <button class="modal-close" id="close-fact-modal">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="fact-form">
                        <input type="hidden" id="metric-id">
                        <input type="hidden" id="period-id">
                        <div class="form-group">
                            <label for="metric-select">Метрика <span class="required">*</span></label>
                            <select id="metric-select" class="form-control" required>
                                <option value="">Выберите метрику</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="period-select">Период <span class="required">*</span></label>
                            <select id="period-select" class="form-control" required>
                                <option value="">Выберите период</option>
                                <option value="1">Январь</option>
                                <option value="2">Февраль</option>
                                <option value="3">Март</option>
                                <option value="4">Апрель</option>
                                <option value="5">Май</option>
                                <option value="6">Июнь</option>
                                <option value="7">Июль</option>
                                <option value="8">Август</option>
                                <option value="9">Сентябрь</option>
                                <option value="10">Октябрь</option>
                                <option value="11">Ноябрь</option>
                                <option value="12">Декабрь</option>
                            </select>
                        </div>
                        <div class="form-group plan-value-info">
                            <label>Плановое значение:</label>
                            <div id="plan-value-display">—</div>
                        </div>
                        <div class="form-group">
                            <label for="fact-value">Фактическое значение <span class="required">*</span></label>
                            <input type="number" id="fact-value" class="form-control" required min="0" step="0.01">
                        </div>
                        <div class="form-group form-check">
                            <input type="checkbox" class="form-check-input" id="recalculate-plan" checked>
                            <label class="form-check-label" for="recalculate-plan">
                                Пересчитать план на оставшиеся месяцы
                                <span class="tooltip">
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span class="tooltip-text">
                                        Если фактическое значение отличается от планового, то на оставшиеся месяцы года план будет скорректирован с учетом фактического результата
                                    </span>
                                </span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-fact-btn">Отмена</button>
                    <button class="btn btn-primary" id="save-fact-btn">Сохранить</button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);

    // Добавляем обработчики для модального окна
    document.getElementById('close-fact-modal').addEventListener('click', () => {
        document.getElementById('add-fact-modal').classList.remove('active');
    });

    document.getElementById('cancel-fact-btn').addEventListener('click', () => {
        document.getElementById('add-fact-modal').classList.remove('active');
    });

    document.getElementById('save-fact-btn').addEventListener('click', async () => {
        const form = document.getElementById('fact-form');
        if (form.checkValidity()) {
            const metricId = document.getElementById('metric-select').value;
            const periodMonth = parseInt(document.getElementById('period-select').value);
            const periodId = document.getElementById('period-id').value;
            const factValue = parseFloat(document.getElementById('fact-value').value);
            const recalculatePlan = document.getElementById('recalculate-plan').checked;
            const planValue = parseFloat(document.getElementById('plan-value-display').getAttribute('data-value') || 0);

            console.log('Данные формы:', {
                metricId, 
                periodMonth, 
                periodId, 
                factValue, 
                recalculatePlan, 
                planValue
            });
            
            try {
                showLoading();
                
                // Определяем год из текущей даты или из виртуального ID периода
                let year = new Date().getFullYear();
                if (periodId && periodId.startsWith('month-')) {
                    const parts = periodId.split('-');
                    if (parts.length > 1) {
                        year = parseInt(parts[1]);
                    }
                }
                
                // Вычисляем квартал по месяцу (убедимся что это число)
                const quarter = Math.ceil(periodMonth / 3);
                
                // Получаем ID магазина
                const shopId = getUrlParams().storeId;
                
                console.log('Параметры периода:', {
                    year,
                    month: periodMonth,
                    quarter,
                    shopId
                });
                
                // Проверяем, существует ли уже фактическое значение для этого периода
                try {
                    const existingValues = await apiClient.getActualValuesByPeriodParams(metricId, year, periodMonth);
                    console.log('Существующие значения:', existingValues);
                    
                    if (existingValues && existingValues.length > 0) {
                        // Обновляем существующее фактическое значение
                        console.log('Обновляем существующее значение');
                        const updateResult = await apiClient.updateActualValueByPeriod(
                            metricId, 
                            shopId, 
                            year, 
                            factValue, 
                            periodMonth, 
                            quarter
                        );
                        console.log('Результат обновления:', updateResult);
                    } else {
                        // Создаем новое фактическое значение
                        console.log('Создаем новое значение');
                        const actualData = {
                            metric_id: metricId,
                            shop_id: shopId,
                            year: year,
                            value: factValue
                        };
                        
                        // Добавляем месяц и квартал только если они есть
                        if (periodMonth) actualData.month = periodMonth;
                        if (quarter) actualData.quarter = quarter;
                        
                        console.log('Данные для создания фактического значения:', actualData);
                        
                        // Создаем фактическое значение
                        const createResult = await apiClient.createActualValueWithPeriod(actualData);
                        console.log('Результат создания:', createResult);
                    }
                    
                    // Если нужно пересчитать план на оставшиеся месяцы
                    if (recalculatePlan && planValue !== factValue) {
                        // Отправляем запрос на пересчет плана
                        console.log('Запрос на пересчет плана');
                        const recalcResult = await apiClient.postWithParams('/finance/plan-values/recalculate-with-actual', {
                            metric_id: metricId,
                            shop_id: shopId,
                            year: parseInt(year),
                            actual_month: parseInt(periodMonth),
                            actual_value: parseFloat(factValue)
                        });
                        console.log('Результат пересчета:', recalcResult);
                        
                        showNotification('Значение добавлено и план пересчитан', 'success');
                    } else {
                        showNotification('Значение успешно добавлено', 'success');
                    }
                    
                    hideLoading();
                    document.getElementById('add-fact-modal').classList.remove('active');
                    
                    // Обновляем таблицу метрик
                    await loadMetrics();
                } catch (apiError) {
                    console.error('Ошибка API:', apiError);
                    hideLoading();
                    showNotification('Ошибка при обработке значения: ' + apiError.message, 'error');
                }
                
            } catch (error) {
                hideLoading();
                console.error('Полная ошибка:', error);
                showNotification('Ошибка при добавлении значения: ' + error.message, 'error');
            }
        } else {
            form.reportValidity();
        }
    });
    
    // Добавляем обработчик изменения выбранной метрики и периода
    document.getElementById('metric-select').addEventListener('change', async function() {
        document.getElementById('metric-id').value = this.value;
        await loadPlanValue();
    });
    
    document.getElementById('period-select').addEventListener('change', async function() {
        if (document.getElementById('metric-select').value) {
            await loadPlanValue();
        }
    });
    
    // Функция для загрузки планового значения
    async function loadPlanValue() {
        const metricId = document.getElementById('metric-select').value;
        const periodMonth = document.getElementById('period-select').value;
        
        if (!metricId || !periodMonth) {
            document.getElementById('plan-value-display').textContent = '—';
            document.getElementById('plan-value-display').setAttribute('data-value', '0');
            console.log('Метрика или период не выбраны');
            return;
        }
        
        try {
            showLoading();
            
            // Получаем текущий год и параметры периода
            const monthNum = parseInt(periodMonth);
            const currentYear = new Date().getFullYear();
            const quarter = Math.ceil(monthNum / 3);
            
            // Сохраняем виртуальный ID периода для обратной совместимости
            const virtualPeriodId = `month-${currentYear}-${monthNum}`;
            document.getElementById('period-id').value = virtualPeriodId;
            
            let planValue = 0;
            let unit = '';
            
            try {
                // Пытаемся получить плановое значение для выбранной метрики и периода
                const planValues = await apiClient.getPlanValuesByPeriodParams(metricId, currentYear, monthNum, quarter);
                
                if (planValues && planValues.length > 0) {
                    // Если значение найдено, используем его
                    planValue = parseFloat(planValues[0].value);
                    console.log(`Найдено плановое значение: ${planValue}`);
                } else {
                    // Если для месяца нет значения, попробуем получить квартальное
                    const quarterValues = await apiClient.getPlanValuesByPeriodParams(metricId, currentYear, null, quarter);
                    
                    if (quarterValues && quarterValues.length > 0) {
                        // Берем квартальное значение и делим на 3
                        planValue = parseFloat(quarterValues[0].value) / 3;
                        console.log(`Используем квартальное значение: ${quarterValues[0].value} / 3 = ${planValue}`);
            } else {
                        // Если для квартала нет значения, попробуем получить годовое
                        const yearValues = await apiClient.getPlanValuesByPeriodParams(metricId, currentYear);
                        
                        if (yearValues && yearValues.length > 0) {
                            // Берем годовое значение и делим на 12
                            planValue = parseFloat(yearValues[0].value) / 12;
                            console.log(`Используем годовое значение: ${yearValues[0].value} / 12 = ${planValue}`);
                        }
                    }
                }
                
                // Запрашиваем метрику для получения единицы измерения
                const metricData = await apiClient.get(`/finance/metrics/${metricId}`);
                if (metricData) {
                    unit = metricData.unit;
                }
            } catch (error) {
                console.error('Ошибка при загрузке значений с сервера:', error);
                
                // Можно использовать кэшированные данные как запасной вариант
                const loadedMetrics = window.loadedMetricsData || [];
                if (loadedMetrics.length > 0) {
                    // Ищем нужную метрику
                    const metric = loadedMetrics.find(m => m.id === metricId);
                    if (metric) {
                        unit = metric.unit;
                        
                        // Ищем плановое значение для этого периода
                        const monthPeriodId = `month-${currentYear}-${monthNum}`;
                        const planValueObj = metric.planValues.find(pv => pv.period_id === monthPeriodId);
                        
                        if (planValueObj) {
                            planValue = parseFloat(planValueObj.value);
                        } else {
                            // Если для месяца нет значения, используем годовое / 12
                            const yearPeriodId = `year-${currentYear}`;
                            const yearPlan = metric.planValues.find(pv => pv.period_id === yearPeriodId);
                            
                            if (yearPlan) {
                                planValue = parseFloat(yearPlan.value) / 12;
                            }
                        }
                    }
                }
            }
            
            // Обновляем отображение планового значения
            const planValueDisplay = document.getElementById('plan-value-display');
            planValueDisplay.textContent = `${formatNumber(planValue)} ${unit}`;
            planValueDisplay.setAttribute('data-value', planValue);
            
            // Предзаполняем поле фактического значения плановым
            const factValueInput = document.getElementById('fact-value');
            if (factValueInput && !factValueInput.value) {
                factValueInput.value = planValue;
            }
            
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error('Ошибка при загрузке планового значения:', error);
            document.getElementById('plan-value-display').textContent = '—';
            document.getElementById('plan-value-display').setAttribute('data-value', '0');
        }
    }
}

// Функция для создания модального окна редактирования значений
function createEditValueModal() {
    const modalHtml = `
        <div class="modal" id="edit-value-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Редактирование значения</h3>
                    <button class="modal-close" id="close-edit-value-modal">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="edit-value-form">
                        <input type="hidden" id="edit-metric-id">
                        <input type="hidden" id="edit-period-id">
                        <input type="hidden" id="edit-value-type">
                        
                        <div class="form-group">
                            <label id="edit-metric-name-label">Метрика</label>
                            <div id="edit-metric-name" class="form-control-static"></div>
                        </div>
                        
                        <div class="form-group">
                            <label id="edit-period-name-label">Период</label>
                            <div id="edit-period-name" class="form-control-static"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-value">Значение <span class="required">*</span></label>
                            <input type="number" id="edit-value" class="form-control" required min="0" step="0.01">
                        </div>
                        
                        <div class="form-group form-check" id="recalculate-container">
                            <input type="checkbox" class="form-check-input" id="edit-recalculate-plan" checked>
                            <label class="form-check-label" for="edit-recalculate-plan">
                                Пересчитать план на оставшиеся месяцы
                                <span class="tooltip">
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span class="tooltip-text">
                                        Если фактическое значение отличается от планового, то на оставшиеся месяцы года план будет скорректирован с учетом фактического результата
                                    </span>
                                </span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-edit-value-btn">Отмена</button>
                    <button class="btn btn-primary" id="save-edit-value-btn">Сохранить</button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);

    // Добавляем стили для статичного текста в форме
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .form-control-static {
            padding: 0.5rem 0.75rem;
            background-color: var(--background);
            border-radius: var(--input-border-radius);
            border: 1px solid var(--border);
            min-height: 2.5rem;
            display: flex;
            align-items: center;
            font-weight: 500;
        }
    `;
    document.head.appendChild(styleElement);

    // Добавляем обработчики для модального окна
    document.getElementById('close-edit-value-modal').addEventListener('click', () => {
        document.getElementById('edit-value-modal').classList.remove('active');
    });

    document.getElementById('cancel-edit-value-btn').addEventListener('click', () => {
        document.getElementById('edit-value-modal').classList.remove('active');
    });

    document.getElementById('save-edit-value-btn').addEventListener('click', async () => {
        const form = document.getElementById('edit-value-form');
        if (form.checkValidity()) {
            const metricId = document.getElementById('edit-metric-id').value;
            const periodId = document.getElementById('edit-period-id').value;
            const valueType = document.getElementById('edit-value-type').value;
            const newValue = parseFloat(document.getElementById('edit-value').value);
            const recalculatePlan = document.getElementById('edit-recalculate-plan').checked;
            
            try {
                showLoading();
                
                // Извлекаем параметры периода из periodId
                let year = null;
                let month = null;
                let quarter = null;
                
                if (periodId.startsWith('month-') || periodId.startsWith('quarter-')) {
                    const parts = periodId.split('-');
                    const periodType = parts[0]; // month или quarter
                    year = parseInt(parts[1]);
                    
                    if (periodType === 'month' && parts.length > 2) {
                        month = parseInt(parts[2]);
                        quarter = Math.ceil(month / 3);
                    } else if (periodType === 'quarter' && parts.length > 2) {
                        quarter = parseInt(parts[2]);
                    }
                } else {
                    // Если это не виртуальный ID, получаем данные периода из API
                    try {
                        const periodData = await apiClient.get(`/finance/periods/${periodId}`);
                        year = periodData.year;
                        month = periodData.month;
                        quarter = periodData.quarter;
                    } catch (error) {
                        console.error('Не удалось получить данные периода:', error);
                        throw new Error('Не удалось определить период. Пожалуйста, попробуйте снова.');
                    }
                }
                
                if (!year) {
                    throw new Error('Не указан год периода');
                }
                
                const shopId = getUrlParams().storeId;
                
                // Используем новые методы API в зависимости от типа значения
                if (valueType === 'plan') {
                    // Проверяем, существует ли уже плановое значение
                    const planValues = await apiClient.getPlanValuesByPeriodParams(metricId, year, month, quarter);
                    
                    if (planValues && planValues.length > 0) {
                        // Обновляем существующее значение
                        await apiClient.updatePlanValueByPeriod(metricId, shopId, year, newValue, month, quarter);
                    } else {
                        // Создаем новое значение
                        const planData = {
                            metric_id: metricId,
                            shop_id: shopId,
                            year: year,
                            value: newValue
                        };
                        
                        if (month !== null) planData.month = month;
                        if (quarter !== null) planData.quarter = quarter;
                        
                        await apiClient.createPlanValueWithPeriod(planData);
                    }
                    
                    showNotification('Плановое значение успешно обновлено', 'success');
                } else {
                    // Фактическое значение
                    // Проверяем, существует ли уже фактическое значение
                    const actualValues = await apiClient.getActualValuesByPeriodParams(metricId, year, month, quarter);
                    
                    if (actualValues && actualValues.length > 0) {
                        // Обновляем существующее значение
                        await apiClient.updateActualValueByPeriod(metricId, shopId, year, newValue, month, quarter);
                    } else {
                        // Создаем новое значение
                        const actualData = {
                            metric_id: metricId,
                            shop_id: shopId,
                            year: year,
                            value: newValue
                        };
                        
                        if (month !== null) actualData.month = month;
                        if (quarter !== null) actualData.quarter = quarter;
                        
                        await apiClient.createActualValueWithPeriod(actualData);
                    }
                    
                    // Если это фактическое значение и нужно пересчитать план
                    if (recalculatePlan && month) {
                            // Отправляем запрос на пересчет плана
                            await apiClient.postWithParams('/finance/plan-values/recalculate-with-actual', {
                                metric_id: metricId,
                            shop_id: shopId,
                            year: year,
                            actual_month: month,
                                actual_value: newValue
                            });
                            
                            showNotification('Значение обновлено и план пересчитан', 'success');
                        } else {
                        showNotification('Фактическое значение успешно обновлено', 'success');
                        }
                }
                
                hideLoading();
                document.getElementById('edit-value-modal').classList.remove('active');
                
                // Перезагружаем данные после обновления
                await loadMetrics();
                
            } catch (error) {
                hideLoading();
                console.error('Ошибка при обновлении значения:', error);
                showNotification(`Ошибка при обновлении значения: ${error.message}`, 'error');
            }
        } else {
            form.reportValidity();
        }
    });
}

// Функция отображения уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">${message}</div>
        <button class="notification-close">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие уведомления через 3 секунды
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
    
    // Обработка кнопки закрытия
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
}

// Функция для проверки, имеет ли пользователь права администратора или менеджера
async function hasAdminRights() {
    try {
        // Импортируем сервис авторизации, если он еще не импортирован
        if (typeof authService === 'undefined') {
            const { default: auth } = await import('../auth/auth.js');
            window.authService = auth;
        }
        
        const user = await authService.getCurrentUser();
        if (!user || !user.role) {
            return false;
        }
        
        // Пользователь имеет права, если его роль - admin или manager
        return user.role.name === 'admin' || user.role.name === 'manager';
    } catch (error) {
        console.error('Ошибка при проверке прав пользователя:', error);
        return false;
    }
}

// Глобальная переменная для хранения прав пользователя
let userHasAdminRights = false;

// Функция для добавления кнопок действий для метрик
function addMetricActionButtons(metrics) {
    // Создаем контейнер для кнопок, если его нет
    let actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) {
        actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        // Показываем кнопки только для админов и менеджеров
        if (userHasAdminRights) {
            // Добавляем кнопку для инициализации года
            const initYearBtn = document.createElement('button');
            initYearBtn.className = 'btn btn-secondary';
            initYearBtn.id = 'initYearBtn';
            initYearBtn.innerHTML = `
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Инициализация года
            `;
            actionButtons.appendChild(initYearBtn);
            
            // Добавляем кнопку для добавления новой метрики
            const addMetricBtn = document.createElement('button');
            addMetricBtn.className = 'btn btn-primary';
            addMetricBtn.id = 'add-metric-btn';
            addMetricBtn.innerHTML = `
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Добавить метрику
            `;
            actionButtons.appendChild(addMetricBtn);
        }
        
        // Добавляем контейнер перед таблицей
        const tableContainer = document.querySelector('.salary-table-container');
        tableContainer.parentNode.insertBefore(actionButtons, tableContainer);
        
        // Добавляем обработчики только для админов и менеджеров
        if (userHasAdminRights) {
            // Добавляем обработчик для кнопки добавления метрики
            document.getElementById('add-metric-btn')?.addEventListener('click', () => {
                document.getElementById('add-metric-modal').classList.add('active');
            });
            
            // Добавляем обработчик для кнопки инициализации года
            document.getElementById('initYearBtn')?.addEventListener('click', showInitYearModal);
        }
    }
    
    // Добавляем кнопку для добавления годового плана только для админов и менеджеров
    if (userHasAdminRights) {
        const addYearlyPlanBtn = document.getElementById('add-yearly-plan-btn');
        if (!addYearlyPlanBtn) {
            const button = document.createElement('button');
            button.className = 'btn btn-info';
            button.id = 'add-yearly-plan-btn';
            button.innerHTML = `
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Годовой план
            `;
            
            // Добавляем обработчик для кнопки
            button.addEventListener('click', async () => {
                // Создаем модальное окно если его еще нет
                if (!document.getElementById('yearly-plan-modal')) {
                    await createYearlyPlanModal();
                }
                document.getElementById('yearly-plan-modal').classList.add('active');
            });
            
            actionButtons.appendChild(button);
        }
    }
    
    // Обновляем выпадающий список метрик
    updateMetricSelect(metrics);
}

// Обновление выпадающего списка метрик
function updateMetricSelect(metrics) {
    const select = document.getElementById('metric-select');
    
    // Очищаем список, оставляя первый пустой элемент
    select.innerHTML = '<option value="">Выберите метрику</option>';
    
    // Добавляем метрики в список
    metrics.forEach(metric => {
        const option = document.createElement('option');
        option.value = metric.id;
        option.textContent = `${metric.name} (${metric.unit})`;
        select.appendChild(option);
    });
}

// Обработчик сортировки таблицы
function setupTableSorting() {
    // Функция отключена для исключения возможности сортировки
    console.log('Сортировка таблицы отключена');
}

// Функция сортировки таблицы
function sortTable(sortKey, direction) {
    const tableBody = document.getElementById('salaryTableBody');
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    
    // Определяем индекс столбца для сортировки
    const columnIndex = findColumnIndex(sortKey);
    if (columnIndex === -1) return;
    
    // Сортируем строки
    rows.sort((rowA, rowB) => {
        const cellA = rowA.cells[columnIndex].textContent.trim();
        const cellB = rowB.cells[columnIndex].textContent.trim();
        
        // Извлекаем числовые значения (если они есть)
        const valueA = extractNumericValue(cellA);
        const valueB = extractNumericValue(cellB);
        
        if (valueA !== null && valueB !== null) {
            // Сортировка чисел
            return direction === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
            // Сортировка текста
            return direction === 'asc' 
                ? cellA.localeCompare(cellB, 'ru') 
                : cellB.localeCompare(cellA, 'ru');
        }
    });
    
    // Обновляем таблицу
    rows.forEach(row => tableBody.appendChild(row));
}

// Функция для извлечения числового значения из строки
function extractNumericValue(text) {
    const matches = text.match(/[-+]?[0-9]*[.,]?[0-9]+/);
    if (matches && matches.length > 0) {
        return parseFloat(matches[0].replace(',', '.'));
    }
    return null;
}

// Функция для определения индекса столбца по ключу сортировки
function findColumnIndex(sortKey) {
    const headerRow = document.querySelector('.salary-table thead tr.sub-header');
    if (!headerRow) return -1;
    
    for (let i = 0; i < headerRow.cells.length; i++) {
        const cell = headerRow.cells[i];
        if (cell.dataset.sort === sortKey) {
            // +1 потому что в теле таблицы есть первая ячейка с периодом
            return i + 1;
        }
    }
    
    return -1;
}

// Функция для создания модального окна годового плана
async function createYearlyPlanModal() {
    const modalHtml = `
        <div class="modal" id="yearly-plan-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Добавить годовой план</h3>
                    <button class="modal-close" id="close-yearly-plan-modal">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="yearly-plan-form">
                        <div class="form-group">
                            <label for="yearly-metric-select">Метрика <span class="required">*</span></label>
                            <select id="yearly-metric-select" class="form-control" required>
                                <option value="">Загрузка метрик...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="yearly-value">Годовой план <span class="required">*</span></label>
                            <input type="number" id="yearly-value" class="form-control" required min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <div class="info-message">
                                План будет равномерно распределен по месяцам года.
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-yearly-plan-btn">Отмена</button>
                    <button class="btn btn-primary" id="save-yearly-plan-btn">Сохранить</button>
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);

    // Добавляем обработчики для модального окна
    document.getElementById('close-yearly-plan-modal').addEventListener('click', () => {
        document.getElementById('yearly-plan-modal').classList.remove('active');
    });

    document.getElementById('cancel-yearly-plan-btn').addEventListener('click', () => {
        document.getElementById('yearly-plan-modal').classList.remove('active');
    });

    // Заполнение выпадающего списка метрик используя кэшированные данные или загружаем их
            const select = document.getElementById('yearly-metric-select');
    
    try {
        // Проверяем наличие кэшированных метрик
        let loadedMetrics = window.loadedMetricsData || [];
        
        // Если метрик нет, пробуем загрузить их
        if (loadedMetrics.length === 0) {
            // Пытаемся загрузить метрики
            const { categoryId, storeId } = getUrlParams();
            if (categoryId && storeId) {
                showLoading();
                try {
                    // Загружаем метрики через API
                    const currentYear = new Date().getFullYear();
                    const detailedMetrics = await apiClient.get(`/finance/analytics/metrics/details/${categoryId}/${storeId}/${currentYear}`);
                    
                    if (detailedMetrics && detailedMetrics.metrics && detailedMetrics.metrics.length > 0) {
                        // Преобразуем данные и сохраняем в window.loadedMetricsData
                        await loadMetrics();
                        loadedMetrics = window.loadedMetricsData || [];
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке метрик:', error);
                } finally {
                    hideLoading();
                }
            }
        }
        
        // Очищаем список
        select.innerHTML = '';
        
        // Добавляем пустую опцию
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Выберите метрику';
        select.appendChild(emptyOption);
        
        if (loadedMetrics.length > 0) {
            // Если метрики есть, заполняем выпадающий список
            loadedMetrics.forEach(metric => {
                const option = document.createElement('option');
                option.value = metric.id;
                option.textContent = `${metric.name} (${metric.unit})`;
                select.appendChild(option);
            });
        } else {
            // Если метрик нет, показываем сообщение
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Нет доступных метрик";
            option.disabled = true;
            select.appendChild(option);
            
            // Показываем уведомление
            showNotification('Не удалось загрузить метрики. Проверьте соединение с сервером.', 'warning');
        }
    } catch (error) {
            console.error('Ошибка при загрузке метрик:', error);
        select.innerHTML = '<option value="">Ошибка загрузки метрик</option>';
        showNotification('Ошибка при загрузке метрик: ' + error.message, 'error');
    }

    // Обработчик сохранения годового плана
    document.getElementById('save-yearly-plan-btn').addEventListener('click', async () => {
        const form = document.getElementById('yearly-plan-form');
        if (form.checkValidity()) {
            const metricId = document.getElementById('yearly-metric-select').value;
            const yearlyValue = document.getElementById('yearly-value').value;
            
            try {
                showLoading();
                
                // Получаем текущий год
                const currentYear = new Date().getFullYear();
                
                // Проверка корректности UUID 
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidPattern.test(metricId)) {
                    throw new Error('Некорректный ID метрики');
                }
                
                const storeId = getUrlParams().storeId;
                if (!uuidPattern.test(storeId)) {
                    throw new Error('Некорректный ID магазина');
                }
                
                // Отправляем запрос на сервер
                await apiClient.postWithParams('/finance/plan-values/distribute-yearly', {
                    metric_id: metricId,
                    shop_id: storeId,
                    year: currentYear,
                    yearly_value: yearlyValue
                });
                
                showNotification('Годовой план успешно создан', 'success');
                hideLoading();
                document.getElementById('yearly-plan-modal').classList.remove('active');
                
                // Обновляем таблицу метрик
                await loadMetrics();
                
            } catch (error) {
                hideLoading();
                showNotification('Ошибка при создании годового плана: ' + error.message, 'error');
            }
        } else {
            form.reportValidity();
        }
    });
}

// Функция для создания кнопок переключения метрик для графиков
function createChartSwitchButtons(metrics) {
    // Получаем контейнер для кнопок
    const chartTabs = document.querySelector('.chart-tabs');
    if (!chartTabs) return;
    
    // Очищаем контейнер от существующих кнопок
    chartTabs.innerHTML = '';
    
    // Проверяем, что у нас есть метрики для отображения
    if (!metrics || metrics.length === 0) {
        chartTabs.innerHTML = '<div class="no-metrics">Нет метрик для отображения</div>';
        return;
    }
    
    // Добавляем кнопки для каждой метрики (до 4 кнопок максимум)
    const maxButtons = Math.min(metrics.length, 4);
    
    for (let i = 0; i < maxButtons; i++) {
        const metric = metrics[i];
        const button = document.createElement('button');
        button.className = i === 0 ? 'chart-tab active' : 'chart-tab';
        button.dataset.metricId = metric.id;
        button.textContent = metric.name;
        
        chartTabs.appendChild(button);
    }
}

// Модифицируем функцию setupCharts, чтобы она работала с динамически созданными кнопками
async function setupCharts(metrics, periods) {
    // Сначала создаем кнопки на основе доступных метрик
    createChartSwitchButtons(metrics);
    
    // Получаем обновленные кнопки для переключения типа данных
    const chartTabs = document.querySelectorAll('.chart-tab');
    // Получаем кнопки для переключения вида (кварталы/месяцы)
    const chartViewBtns = document.querySelectorAll('.chart-view-btn');
    
    // Контейнер для графика
    const chartContainer = document.getElementById('hoursChart');
    // Заголовок графика
    const chartTitle = document.querySelector('.chart-title');
    
    // Текущая активная метрика (по умолчанию - первая метрика)
    let activeMetric = metrics.length > 0 ? metrics[0] : null;
    // Текущий вид (по умолчанию - кварталы)
    let activeView = 'quarters';
    
    // Обработчик клика по кнопке выбора метрики
    chartTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Удаляем класс active у всех кнопок
            chartTabs.forEach(t => t.classList.remove('active'));
            // Добавляем класс active выбранной кнопке
            this.classList.add('active');
            
            // Получаем ID метрики из атрибута data-metric-id
            const metricId = this.dataset.metricId;
            
            // Находим метрику по ID
            activeMetric = metrics.find(m => m.id === metricId) || metrics[0];
            
            // Обновляем график
            renderChart(activeMetric, activeView);
        });
    });
    
    // Обработчик клика по кнопке выбора вида
    chartViewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Удаляем класс active у всех кнопок
            chartViewBtns.forEach(b => b.classList.remove('active'));
            // Добавляем класс active выбранной кнопке
            this.classList.add('active');
            
            // Получаем вид по атрибуту data-view
            activeView = this.getAttribute('data-view');
            
            // Обновляем график
            renderChart(activeMetric, activeView);
        });
    });
    
    // Функция для рендеринга графика
    function renderChart(metric, view) {
        if (!metric) {
            chartContainer.innerHTML = '<div class="no-data">Нет данных для отображения</div>';
            return;
        }
        
        // Обновляем заголовок графика
        const viewText = view === 'quarters' ? 'кварталам' : 'месяцам';
        chartTitle.textContent = `Сравнение ${metric.name} по ${viewText} (${metric.unit})`;
        
        // Данные для графика
        let chartData = [];
        
        if (view === 'quarters') {
            // Для квартального вида группируем данные по кварталам
            for (let quarter = 1; quarter <= 4; quarter++) {
                // Находим период-квартал
                const quarterPeriod = periods.find(p => p.quarter === quarter && p.month === null);
                if (!quarterPeriod) continue;
                
                // Получаем плановое значение для квартала
                const planValue = metric.planValues.find(plan => plan.period_id === quarterPeriod.id);
                const planVal = planValue ? parseFloat(planValue.value) : 0;
                
                // Получаем фактические значения для квартала
                // Для этого суммируем значения всех месяцев квартала
                const quarterMonths = periods.filter(p => p.quarter === quarter && p.month !== null);
                const quarterMonthIds = quarterMonths.map(m => m.id);
                const quarterFactValues = metric.actualValues.filter(actual => quarterMonthIds.includes(actual.period_id));
                const factVal = quarterFactValues.reduce((sum, actual) => sum + parseFloat(actual.value), 0);
                
                chartData.push({
                    label: `${quarter} квартал`,
                    plan: planVal,
                    fact: factVal
                });
            }
        } else {
            // Для месячного вида группируем данные по месяцам
            const monthNames = {
                1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
                7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
            };
            
            // Создаем уникальный список месяцев
            const uniqueMonths = new Map();
            periods.filter(p => p.month !== null).forEach(period => {
                if (!uniqueMonths.has(period.month)) {
                    uniqueMonths.set(period.month, period);
                }
            });
            
            // Сортируем месяцы по номеру
            const monthPeriods = Array.from(uniqueMonths.values()).sort((a, b) => a.month - b.month);
            
            // Для каждого месяца получаем данные
            monthPeriods.forEach(period => {
                // Получаем плановое значение для месяца
                const planValue = metric.planValues.find(plan => plan.period_id === period.id);
                const planVal = planValue ? parseFloat(planValue.value) : 0;
                
                // Получаем фактическое значение для месяца
                const actualValue = metric.actualValues.find(actual => actual.period_id === period.id);
                const factVal = actualValue ? parseFloat(actualValue.value) : 0;
                
                chartData.push({
                    label: monthNames[period.month],
                    plan: planVal,
                    fact: factVal
                });
            });
        }
        
        // Рисуем график, передаем метрику в функцию renderBarChart
        renderBarChart(chartContainer, chartData, metric);
    }
    
    // Функция для рендеринга столбчатого графика
    function renderBarChart(container, data, currentMetric) {
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Проверяем, есть ли данные
        if (data.length === 0) {
            container.innerHTML = '<div class="no-data">Нет данных для отображения</div>';
            return;
        }
        
        // Находим максимальное значение для масштабирования
        const maxValue = Math.max(
            ...data.map(item => Math.max(item.plan, item.fact))
        );
        
        // Создаем HTML для графика
        const chartHtml = `
            <div class="chart-bars">
                ${data.map(item => `
                    <div class="chart-bar-group">
                        <div class="chart-bar-label">${item.label}</div>
                        <div class="chart-bars-container">
                            <div class="chart-bar chart-bar--plan" style="height: ${(item.plan / maxValue * 100)}%" data-label="План: ${formatNumber(item.plan)} ${currentMetric.unit}"></div>
                            <div class="chart-bar chart-bar--fact" style="height: ${(item.fact / maxValue * 100)}%" data-label="Факт: ${formatNumber(item.fact)} ${currentMetric.unit}"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Добавляем HTML в контейнер
        container.innerHTML = chartHtml;
        
        // Добавляем стили для графика, если их еще нет
        if (!document.getElementById('chart-styles')) {
            const chartStyles = `
                .chart-bars {
                    display: flex;
                    height: 300px;
                    align-items: flex-end;
                    padding: 20px 0;
                }
                .chart-bar-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    height: 100%;
                }
                .chart-bar-label {
                    margin: 24px 0;
                    font-size: 12px;
                    text-align: center;
                }
                .chart-bars-container {
                    display: flex;
                    align-items: flex-end;
                    height: 100%;
                    width: 100%;
                    justify-content: center;
                    gap: 5px;
                }
                .chart-bar {
                    width: 30px;
                    position: relative;
                    border-radius: 4px 4px 0 0;
                    transition: height 0.3s;
                }
                .chart-bar--plan {
                    background-color: var(--primary-light);
                }
                .chart-bar--fact {
                    background-color: var(--primary);
                }
                .chart-bar-value {
                    position: absolute;
                    top: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 200;
                }
                .chart-bar:hover {
                    opacity: 0.9;
                    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);

                }
                .chart-bar--plan:hover::before,
                .chart-bar--fact:hover::before {
                    content: attr(data-label);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    margin-bottom: 5px;
                    pointer-events: none;
                    z-index: 25;
                }
                .chart-bar--plan:hover::after,
                .chart-bar--fact:hover::after {
                    content: '';
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    margin-bottom: 0;
                    border-width: 5px;
                    border-style: solid;
                    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
                    transform: translateX(-50%) rotate(180deg);
                    pointer-events: none;
                    z-index: 10;
                }
                .no-data {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 300px;
                    color: var(--text-secondary);
                }
                .no-metrics {
                    padding: 10px;
                    color: var(--text-secondary);
                    text-align: center;
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.id = 'chart-styles';
            styleElement.textContent = chartStyles;
            document.head.appendChild(styleElement);
        }
    }
    
    // Инициализируем график с первой метрикой и видом по умолчанию
    if (activeMetric) {
        renderChart(activeMetric, activeView);
    }
}

// Добавляем вызов функции setupCharts после загрузки метрик
async function loadMetrics(selectedYear = null, selectedShopId = null) {
    try {
        let categoryId, storeId;

        // Получаем параметры из URL, если они не переданы явно
        const urlParams = getUrlParams();
        categoryId = urlParams.categoryId;
        
        // Используем переданные параметры или берем из URL
        storeId = selectedShopId || urlParams.storeId;
        
        // Если параметры не переданы и не указаны в URL, выходим
        if (!categoryId || !storeId) {
            return;
        }
        
        showLoading();
        
        // Получаем текущий год или используем переданный
        const currentYear = selectedYear || urlParams.year || new Date().getFullYear();
        
        // Получаем все данные через новый API-эндпоинт детальных метрик
        const detailedMetrics = await apiClient.get(`/finance/analytics/metrics/details/${categoryId}/${storeId}/${currentYear}`);
        console.log('Загружены детальные метрики:', detailedMetrics);
        
        if (!detailedMetrics || !detailedMetrics.metrics || detailedMetrics.metrics.length === 0) {
            hideLoading();
            showNotification('Нет доступных метрик для выбранной категории и магазина', 'warning');
                return;
        }
        
        // Преобразуем данные в формат, понятный для существующих функций
        const metrics = detailedMetrics.metrics.map(metric => {
            // Создаем объект метрики
            const metricObj = {
                id: metric.metric_id,
                name: metric.metric_name,
                unit: metric.unit,
                category_id: categoryId,
                planValues: [],
                actualValues: []
            };
            
            // Обрабатываем годовые данные
            if (metric.periods_value.year) {
                const yearData = metric.periods_value.year;
                // Здесь мы не имеем ID периода, но можем создать виртуальный
                const yearPeriodObj = {
                    id: `year-${currentYear}`,
                    year: parseInt(currentYear),
                    quarter: null,
                    month: null
                };
                
                // Добавляем плановое значение
                if (yearData.plan !== undefined) {
                    metricObj.planValues.push({
                        metric_id: metric.metric_id,
                        shop_id: storeId,
                        value: yearData.plan,
                        period_id: yearPeriodObj.id,
                        period: yearPeriodObj
                    });
                }
                
                // Добавляем фактическое значение
                if (yearData.actual !== undefined) {
                    metricObj.actualValues.push({
                        metric_id: metric.metric_id,
                        shop_id: storeId,
                        value: yearData.actual,
                        period_id: yearPeriodObj.id,
                        period: yearPeriodObj
                    });
                }
            }
            
            // Обрабатываем квартальные данные
            Object.entries(metric.periods_value.quarters).forEach(([quarterName, quarterData]) => {
                // Извлекаем номер квартала из названия (например, "I квартал" -> 1)
                const quarterNumber = ["I квартал", "II квартал", "III квартал", "IV квартал"].indexOf(quarterName) + 1;
                if (quarterNumber > 0) {
                    const quarterPeriodObj = {
                        id: `quarter-${currentYear}-${quarterNumber}`,
                        year: parseInt(currentYear),
                        quarter: quarterNumber,
                        month: null
                    };
                    
                    // Добавляем плановое значение
                    if (quarterData.plan !== undefined) {
                        metricObj.planValues.push({
                            metric_id: metric.metric_id,
                            shop_id: storeId,
                            value: quarterData.plan,
                            period_id: quarterPeriodObj.id,
                            period: quarterPeriodObj
                        });
                    }
                    
                    // Добавляем фактическое значение
                    if (quarterData.actual !== undefined) {
                        metricObj.actualValues.push({
                            metric_id: metric.metric_id,
                            shop_id: storeId,
                            value: quarterData.actual,
                            period_id: quarterPeriodObj.id,
                            period: quarterPeriodObj
                        });
                    }
                }
            });
            
            // Обрабатываем месячные данные
            Object.entries(metric.periods_value.months).forEach(([monthName, monthData]) => {
                // Соответствие названий месяцев и их номеров
                const monthNameToNumber = {
                    'январь': 1, 'февраль': 2, 'март': 3, 'апрель': 4, 'май': 5, 'июнь': 6,
                    'июль': 7, 'август': 8, 'сентябрь': 9, 'октябрь': 10, 'ноябрь': 11, 'декабрь': 12
                };
                
                const monthNumber = monthNameToNumber[monthName.toLowerCase()];
                if (monthNumber) {
                    // Определяем квартал по месяцу
                    const quarter = Math.ceil(monthNumber / 3);
                    
                    const monthPeriodObj = {
                        id: `month-${currentYear}-${monthNumber}`,
                        year: currentYear,
                        quarter: quarter,
                        month: monthNumber
                    };
                    
                    // Добавляем плановое значение
                    if (monthData.plan !== undefined) {
                        metricObj.planValues.push({
                            metric_id: metric.metric_id,
                            shop_id: storeId,
                            value: monthData.plan,
                            period_id: monthPeriodObj.id,
                            period: monthPeriodObj
                        });
                    }
                    
                    // Добавляем фактическое значение
                    if (monthData.actual !== undefined) {
                        metricObj.actualValues.push({
                            metric_id: metric.metric_id,
                            shop_id: storeId,
                            value: monthData.actual,
                            period_id: monthPeriodObj.id,
                            period: monthPeriodObj
                        });
                    }
                }
            });
            
            return metricObj;
        });
        
        // Сохраняем преобразованные метрики в глобальной переменной для доступа из других функций
        window.loadedMetricsData = metrics;
        
        // Создаем массив периодов из данных метрик
        const periods = [];
        
        // Для каждой метрики обрабатываем периоды
        metrics.forEach(metric => {
            // Из плановых значений
            metric.planValues.forEach(pv => {
                if (pv.period && !periods.some(p => p.id === pv.period.id)) {
                    periods.push(pv.period);
                }
            });
            
            // Из фактических значений
            metric.actualValues.forEach(av => {
                if (av.period && !periods.some(p => p.id === av.period.id)) {
                    periods.push(av.period);
                }
            });
        });
        
        // Сохраняем периоды в глобальной переменной для доступа из других функций
        window.loadedPeriodsData = periods;
        
        console.log('Преобразованные метрики:', metrics);
        console.log('Извлеченные периоды:', periods);
        
        // Получаем месячные периоды
        const monthPeriods = periods.filter(p => p.month !== null);
        // Получаем квартальные периоды
        const quarterPeriods = periods.filter(p => p.quarter !== null && p.month === null);
        // Получаем годовой период
        const yearPeriods = periods.filter(p => p.quarter === null && p.month === null);
        
        console.log('Месячные периоды:', monthPeriods.length);
        console.log('Квартальные периоды:', quarterPeriods.length);
        console.log('Годовые периоды:', yearPeriods.length);
        
        // Обновляем UI с загруженными данными
        
        // Обновляем заголовок с данными категории и магазина
        document.querySelector('.salary-report__title').textContent = detailedMetrics.category_name || 'Заработная плата';
        document.querySelector('.salary-report__subtitle').textContent = detailedMetrics.shop_name || 'Магазин';
        
        // Обновляем таблицу метрик
        renderMetricsTable(metrics, periods);
        
        // Обновляем выпадающий список метрик в модальном окне
        updateMetricSelect(metrics);
        
        // Добавляем кнопки действий для метрик
        addMetricActionButtons(metrics);
        
        // Настраиваем графики
        setupCharts(metrics, periods);
        
        hideLoading();
        
        // Фиксируем размеры графика при загрузке страницы
        fixChartContainerSize();
    } catch (error) {
        hideLoading();
        showNotification('Ошибка при загрузке метрик: ' + error.message, 'error');
    }
}

// Фиксируем размеры графика при загрузке страницы
function fixChartContainerSize() {
    // Получаем контейнер графика
    const chartContainer = document.querySelector('.chart-container');
    const chart = document.getElementById('hoursChart');
    
    if (chartContainer && chart) {
        // Устанавливаем максимальную высоту для контейнера
        chartContainer.style.maxHeight = '400px';
        chartContainer.style.overflow = 'hidden';
        
        // Устанавливаем высоту для самого графика
        chart.style.height = '280px';
        chart.style.overflow = 'hidden';
        
        // Добавляем обработчик для контроля высоты столбиков
        const resizeObserver = new ResizeObserver(() => {
            const bars = document.querySelectorAll('.chart-bar');
            bars.forEach(bar => {
                // Ограничиваем максимальную высоту столбика
                if (parseInt(bar.style.height) > 95) {
                    bar.style.height = '95%';
                }
            });
        });
        
        // Наблюдаем за изменениями размера контейнера
        resizeObserver.observe(chartContainer);
    }
}

// Вызываем функцию при загрузке страницы и после загрузки данных
document.addEventListener('DOMContentLoaded', function() {
    // Вызываем функцию фиксации размеров графика
    fixChartContainerSize();
    
    // ... существующий код инициализации ...
});

// Инициализация страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
    // Добавляем стили для уведомлений
    const notificationStyles = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            background: white;
            border-radius: var(--card-border-radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 1001;
            min-width: 300px;
            max-width: 500px;
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        
        .notification.hide {
            transform: translateX(100%);
            opacity: 0;
        }
        
        .notification-info {
            border-left: 4px solid var(--primary);
        }
        
        .notification-success {
            border-left: 4px solid var(--success);
        }
        
        .notification-error {
            border-left: 4px solid var(--error);
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = notificationStyles;
    document.head.appendChild(styleElement);
    
    // Получаем параметры из URL
    const { categoryId, storeId, year } = getUrlParams();
    
    // Если параметры отсутствуют, показываем сообщение об ошибке
    if (!categoryId || !storeId) {
        showNotification('Для просмотра отчета необходимо выбрать категорию и магазин', 'error');
        return;
    }
    
    try {
        // Проверяем права пользователя
        userHasAdminRights = await hasAdminRights();
        console.log('Пользователь имеет права администратора/менеджера:', userHasAdminRights);
    } catch (authError) {
        console.error('Ошибка при проверке прав пользователя:', authError);
        userHasAdminRights = false;
    }
    
    // Создаем модальные окна
    createMetricModal();
    createFactValueModal();
    await createYearlyPlanModal();
    createEditValueModal();
    
        try {
    // Настраиваем фильтры
    setupFilters();
    
    // Загружаем метрики (передаем год из URL, если он есть)
    await loadMetrics(year || null);
    
    // Настраиваем сортировку таблицы - перемещаем после загрузки метрик
    setupTableSorting();
    
    // Настраиваем кнопку экспорта
    setupExportButton();
            
            // Фиксируем размеры графика при загрузке страницы
            fixChartContainerSize();
        } catch (metricError) {
            console.error('Ошибка при загрузке и настройке данных:', metricError);
            showNotification(`Ошибка при загрузке данных: ${metricError.message}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка при инициализации страницы:', error);
        hideLoading();
        showNotification(`Ошибка при инициализации страницы: ${error.message}`, 'error');
    }
});

// Функция настройки фильтров
function setupFilters() {
    // Получаем элементы фильтров
    const yearFilter = document.getElementById('yearFilter');
    const shopFilter = document.getElementById('shopFilter');
    
    // Загружаем доступные годы и магазины
    fetchYears();
    fetchShops();
    
    // Обработчик изменения года
    yearFilter?.addEventListener('change', function() {
        const selectedYear = this.value;
        updateDataByFilters(selectedYear, shopFilter.value);
    });
    
    // Обработчик изменения магазина
    shopFilter?.addEventListener('change', function() {
        const selectedShop = this.value;
        updateDataByFilters(yearFilter.value, selectedShop);
    });
    
    // Внутренняя функция для загрузки доступных годов
    async function fetchYears() {
        try {
            showLoading();
            const apiClient = new ApiClient();
            const years = await apiClient.getAvailableYears();
            populateYearFilter(years);
            hideLoading();
        } catch (error) {
            console.error('Ошибка при загрузке годов:', error);
            hideLoading();
            showNotification('Не удалось загрузить список годов', 'error');
        }
    }
    
    // Функция для заполнения селектора годов
    function populateYearFilter(years) {
        if (!yearFilter) return;
        
        yearFilter.innerHTML = '';
        
        // Если нет годов, добавляем текущий
        if (!years.length) {
            const currentYear = new Date().getFullYear();
            const option = document.createElement('option');
            option.value = currentYear;
            option.textContent = `${currentYear} год`;
            yearFilter.appendChild(option);
            return;
        }
        
        // Добавляем все доступные годы
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year} год`;
            yearFilter.appendChild(option);
        });
        
        // Выбираем год из URL, если он есть
        const { year } = getUrlParams();
        if (year && yearFilter.querySelector(`option[value="${year}"]`)) {
            yearFilter.value = year;
        } else if (years.length > 0) {
            // Иначе выбираем текущий или последний доступный год
            const currentYear = new Date().getFullYear();
            if (yearFilter.querySelector(`option[value="${currentYear}"]`)) {
                yearFilter.value = currentYear;
            } else {
                yearFilter.value = years[years.length - 1]; // Последний год в списке
            }
        }
    }
    
    // Функция для обновления данных по выбранным фильтрам
    async function updateDataByFilters(year, shop) {
        try {
            showLoading();
            
            // Получаем текущие параметры из URL
            const { categoryId } = getUrlParams();
            
            // Если нет выбранной категории, показываем уведомление
            if (!categoryId) {
                hideLoading();
                showNotification('Не выбрана категория для фильтрации', 'error');
                return;
            }
            
            // Если выбран год и магазин, загружаем данные для них
            if (year && shop) {
                // Создаем новый URL с выбранными параметрами
                window.history.pushState({}, '', `?category=${categoryId}&store=${shop}&year=${year}`);
                
                // Обновляем заголовок
                const shopSelect = document.getElementById('shopFilter');
                if (shopSelect) {
                    const selectedOption = shopSelect.options[shopSelect.selectedIndex];
                    if (selectedOption) {
                        document.querySelector('.salary-report__subtitle').textContent = selectedOption.textContent;
                    }
                }
                
                // Загружаем метрики с новыми параметрами
                const apiClient = new ApiClient();
                const detailedMetrics = await apiClient.get(`/finance/analytics/metrics/details/${categoryId}/${shop}/${year}`);
                
                // Обновляем метрики и таблицу
                await loadMetrics(year, shop);
                
                // Обновляем графики
                if (window.loadedMetricsData && window.loadedPeriodsData) {
                    setupCharts(window.loadedMetricsData, window.loadedPeriodsData);
                }
            } else {
                hideLoading();
                showNotification('Выберите год и магазин для фильтрации', 'warning');
                return;
            }
            
            hideLoading();
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
            hideLoading();
            showNotification('Не удалось обновить данные: ' + error.message, 'error');
        }
    }
    
    // Функция для загрузки списка магазинов
    async function fetchShops() {
        try {
            const apiClient = new ApiClient();
            const shops = await apiClient.get('/finance/shops');
            populateShopFilter(shops);
        } catch (error) {
            console.error('Ошибка при загрузке магазинов:', error);
            showNotification('Не удалось загрузить список магазинов', 'error');
        }
    }
    
    // Функция для заполнения селектора магазинов
    function populateShopFilter(shops) {
        if (!shopFilter) return;
        
        shopFilter.innerHTML = '';
        
        // Добавляем все магазины
        shops.forEach(shop => {
            const option = document.createElement('option');
            option.value = shop.id;
            option.textContent = shop.name;
            shopFilter.appendChild(option);
        });
        
        // Выбираем магазин из URL, если он есть
        const { storeId } = getUrlParams();
        if (storeId && shopFilter.querySelector(`option[value="${storeId}"]`)) {
            shopFilter.value = storeId;
        } else if (shops.length > 0) {
            // Если нет магазина в URL, выбираем первый магазин
            shopFilter.value = shops[0].id;
        }
    }
}

// Функция для отображения модального окна инициализации года
function showInitYearModal() {
    // Создаем модальное окно
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal active';
    modalContainer.id = 'initYearModal';
    
    // Получаем текущий год
    const currentYear = new Date().getFullYear();
    
    // Создаем содержимое модального окна
    modalContainer.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Инициализация года</h3>
                <button class="modal-close">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p>Укажите год для инициализации периодов (год, кварталы, месяцы):</p>
                <div class="form-group">
                    <label for="init-year">Год</label>
                    <input type="number" id="init-year" class="form-control" value="${currentYear}" min="2000" max="2100">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Отмена</button>
                <button class="btn btn-primary" id="init-year-btn">Инициализировать</button>
            </div>
        </div>
    `;
    
    // Добавляем модальное окно в DOM
    document.body.appendChild(modalContainer);
    
    // Обработчики закрытия модального окна
    const closeBtn = modalContainer.querySelector('.modal-close');
    const cancelBtn = modalContainer.querySelector('.modal-cancel');
    
    closeBtn.addEventListener('click', () => {
        modalContainer.remove();
    });
    
    cancelBtn.addEventListener('click', () => {
        modalContainer.remove();
    });
    
    // Обработчик кнопки инициализации
    const initBtn = modalContainer.querySelector('#init-year-btn');
    initBtn.addEventListener('click', async () => {
        const yearInput = document.getElementById('init-year');
        const year = parseInt(yearInput.value);
        
        if (!year || year < 2000 || year > 2100) {
            showNotification('Введите корректный год (2000-2100)', 'error');
            return;
        }
        
        try {
            showLoading();
            const apiClient = new ApiClient();
            const result = await apiClient.initializeYear(year);
            modalContainer.remove();
            
            // Обновляем список годов
            const years = await apiClient.getAvailableYears();
            const yearFilter = document.getElementById('yearFilter');
            
            if (yearFilter) {
                // Сохраняем текущее выбранное значение
                const currentSelectedYear = yearFilter.value;
                
                // Заполняем селект годами
                yearFilter.innerHTML = '';
                years.forEach(y => {
                    const option = document.createElement('option');
                    option.value = y;
                    option.textContent = `${y} год`;
                    // Если это новый добавленный год или ранее выбранный год
                    if (y === year || y.toString() === currentSelectedYear) {
                        option.selected = true;
                    }
                    yearFilter.appendChild(option);
                });
                
                // Получаем текущие параметры URL
                const { categoryId, storeId } = getUrlParams();
                
                // Обновляем URL с новым годом
                if (categoryId && storeId) {
                    window.history.pushState({}, '', `?category=${categoryId}&store=${storeId}&year=${year}`);
                }
                
                // Загружаем данные для нового года
                await loadMetrics(year);
                
                // Вызываем событие change, чтобы обновились данные
                const event = new Event('change');
                yearFilter.dispatchEvent(event);
            }
            
            hideLoading();
            showNotification(`Периоды для ${year} года успешно созданы`, 'success');
        } catch (error) {
            console.error('Ошибка при инициализации года:', error);
            hideLoading();
            showNotification('Не удалось инициализировать год: ' + error.message, 'error');
        }
    });
}

// Функция настройки кнопки экспорта
function setupExportButton() {
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            showLoading();
            
            // Выполняем экспорт данных
            exportTableToExcel();
        });
    }
}

// Функция экспорта данных в Excel
function exportTableToExcel() {
    try {
        // Получаем таблицу и заголовок отчета
        const table = document.querySelector('.salary-table');
        const reportTitle = document.querySelector('.salary-report__title').textContent;
        const reportSubtitle = document.querySelector('.salary-report__subtitle').textContent;
        
        if (!table) {
            showNotification('Таблица не найдена', 'error');
            hideLoading();
            return;
        }
        
        // Создаем рабочую книгу и лист
        const wb = XLSX.utils.book_new();
        
        // Подготовка данных для Excel
        const rows = [];
        
        // Добавляем заголовок отчета
        rows.push([reportTitle]);
        rows.push([reportSubtitle]);
        rows.push([]); // Пустая строка
        
        // Получаем все строки из таблицы
        const headerRows = table.querySelectorAll('thead tr');
        const bodyRows = table.querySelectorAll('tbody tr');
        const footerRows = table.querySelectorAll('tfoot tr');
        
        // Первая строка заголовка (Период, Метрика 1, Метрика 2, ...)
        const firstHeaderRow = headerRows[0];
        const firstHeaderCells = firstHeaderRow.querySelectorAll('th');
        
        const firstRowData = [];
        firstHeaderCells.forEach(cell => {
            // Первая ячейка - "Период" - добавляем как есть
            if (cell.cellIndex === 0) {
                firstRowData.push(cell.textContent.trim());
            } else {
                // Метрики добавляем с учетом colspan
                const colspan = parseInt(cell.getAttribute('colspan')) || 1;
                const content = cell.textContent.trim();
                firstRowData.push(content);
                
                // Добавляем пустые ячейки для colspan
                for (let i = 1; i < colspan; i++) {
                    firstRowData.push('');
                }
            }
        });
        rows.push(firstRowData);
        
        // Вторая строка заголовка (План, Факт, Отклонение)
        const secondHeaderRow = headerRows[1];
        const secondHeaderCells = secondHeaderRow.querySelectorAll('td');
        
        const secondRowData = [''];  // Первый столбец пустой из-за rowspan в первой строке
        secondHeaderCells.forEach(cell => {
            secondRowData.push(cell.textContent.trim());
        });
        rows.push(secondRowData);
        
        // Добавляем строки данных из тела таблицы
        bodyRows.forEach(row => {
            const rowData = [];
            const cells = row.querySelectorAll('td');
            
            cells.forEach(cell => {
                // Извлекаем только текстовое содержимое без HTML
                let content = cell.textContent.trim();
                
                // Если ячейка содержит кнопку "Внести факт", заменяем на пустое значение
                if (content.includes('Внести факт')) {
                    content = '—';
                }
                
                rowData.push(content);
            });
            
            rows.push(rowData);
        });
        
        // Добавляем итоговую строку
        footerRows.forEach(row => {
            const rowData = [];
            const cells = row.querySelectorAll('td');
            
            cells.forEach(cell => {
                rowData.push(cell.textContent.trim());
            });
            
            rows.push(rowData);
        });
        
        // Создаем лист с данными
        const ws = XLSX.utils.aoa_to_sheet(rows);
        
        // Стили и форматирование для заголовков
        if (!ws['!merges']) ws['!merges'] = [];
        
        // Объединяем ячейки в заголовке отчета
        ws['!merges'].push(
            { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },  // Первая строка (заголовок)
            { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }   // Вторая строка (подзаголовок)
        );
        
        // Добавляем объединение ячеек для заголовков метрик
        const headerRowData = rows[3]; // Первая строка заголовка
        let colIndex = 1; // Начинаем с 1, т.к. "Период" занимает первую колонку
        
        // Обрабатываем заголовки метрик
        for (let i = 1; i < headerRowData.length; i++) {
            // Если ячейка не пустая, то это заголовок метрики
            if (headerRowData[i] && headerRowData[i] !== '') {
                // Ищем следующую непустую ячейку
                let endColIndex = i;
                while (endColIndex + 1 < headerRowData.length && 
                      (headerRowData[endColIndex + 1] === '' || headerRowData[endColIndex + 1] === undefined)) {
                    endColIndex++;
                }
                
                // Объединяем ячейки заголовка метрики
                if (endColIndex > i) {
                    ws['!merges'].push({
                        s: { r: 3, c: i },
                        e: { r: 3, c: endColIndex }
                    });
                    i = endColIndex;
                }
            }
        }
        
        // Объединяем ячейку "Период" по вертикали
        ws['!merges'].push({
            s: { r: 3, c: 0 },
            e: { r: 4, c: 0 }
        });
        
        // Устанавливаем ширину столбцов
        ws['!cols'] = Array(firstRowData.length).fill({ wch: 18 });
        
        // Первый столбец (Период) может быть шире
        ws['!cols'][0] = { wch: 15 };
        
        // Добавляем стили ячеек
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < rows[i].length; j++) {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
                
                if (!ws[cellRef]) {
                    ws[cellRef] = { v: rows[i][j] };
                }
                
                // Устанавливаем стили для заголовков
                if (i <= 1) {
                    // Стили для заголовка отчета
                    ws[cellRef].s = {
                        font: { bold: true, sz: 14 },
                        alignment: { horizontal: 'center' }
                    };
                } else if (i === 3 || i === 4) {
                    // Стили для заголовков таблицы
                    ws[cellRef].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: 'F1F5F9' } },
                        alignment: { horizontal: j === 0 ? 'left' : 'center' }
                    };
                } else if (i === rows.length - 1) {
                    // Стили для итоговой строки
                    ws[cellRef].s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: 'F0F3FF' } }
                    };
                }
            }
        }
        
        // Добавляем лист в книгу
        XLSX.utils.book_append_sheet(wb, ws, 'Отчет');
        
        // Генерируем имя файла на основе заголовка и текущей даты
        const date = new Date();
        const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
        const fileName = `${reportTitle.replace(/[^\wа-яА-Я\s]/gi, '')}_${formattedDate}.xlsx`;
        
        // Сохраняем файл
        XLSX.writeFile(wb, fileName);
        
        hideLoading();
        showNotification('Отчет успешно экспортирован!', 'success');
    } catch (error) {
        console.error('Ошибка при экспорте данных:', error);
        hideLoading();
        showNotification('Ошибка при экспорте данных: ' + error.message, 'error');
    }
}

// Рендеринг таблицы метрик
function renderMetricsTable(metrics, periods) {
    const tableBody = document.getElementById('salaryTableBody');
    const tableHead = document.querySelector('.salary-table thead');
    
    // Проверяем, что таблица существует
    if (!tableBody || !tableHead) {
        console.error('Элементы таблицы не найдены');
        return;
    }
    
    // Очищаем таблицу
    tableBody.innerHTML = '';
    
    // Проверяем, что есть метрики для отображения
    if (metrics.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Нет данных для отображения</td>
            </tr>
        `;
        return;
    }
    
    // Обновляем заголовки метрик
    updateMetricHeaders(metrics);
    
    // Получаем текущий год
    const currentYear = new Date().getFullYear();
    
    // Фильтруем и сортируем периоды только на месяцы текущего года
    // Предотвращаем дублирование месяцев, оставляя только уникальные значения по месяцу
    const uniqueMonths = new Map();
    for (const period of periods.filter(p => p.month !== null)) {
        // Если месяц уже есть в Map, используем существующий период
        // иначе добавляем новый
        if (!uniqueMonths.has(period.month)) {
            uniqueMonths.set(period.month, period);
        }
    }
    
    // Конвертируем Map в массив и сортируем по номеру месяца
    const monthPeriods = Array.from(uniqueMonths.values())
        .sort((a, b) => a.month - b.month);
    
    // Фильтруем и сортируем периоды только на кварталы текущего года
    const quarterPeriods = periods
        .filter(period => period.quarter !== null && period.month === null)
        .sort((a, b) => a.quarter - b.quarter);
    
    // Если нет периодов, покажем пустую таблицу
    if (monthPeriods.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Нет данных о периодах для отображения</td>
            </tr>
        `;
        return;
    }
    
    // Соответствие числа месяца и его названия
    const monthNames = {
        1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
        7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
    };
    
    // Соответствие числа квартала и его названия
    const quarterNames = {
        1: 'I квартал', 2: 'II квартал', 3: 'III квартал', 4: 'IV квартал'
    };
    
    // Группируем месяцы по кварталам
    const quarterMonths = {
        1: monthPeriods.filter(p => p.month >= 1 && p.month <= 3),
        2: monthPeriods.filter(p => p.month >= 4 && p.month <= 6),
        3: monthPeriods.filter(p => p.month >= 7 && p.month <= 9),
        4: monthPeriods.filter(p => p.month >= 10 && p.month <= 12)
    };
    
    // Перебираем кварталы и добавляем строки для каждого квартала и его месяцев
    for (let quarter = 1; quarter <= 4; quarter++) {
        // Находим период-квартал
        const quarterPeriod = quarterPeriods.find(p => p.quarter === quarter);
        
        if (quarterPeriod) {
            // Создаем строку для квартала
            const quarterRow = document.createElement('tr');
            quarterRow.className = 'quarter-row';
            
            // Добавляем ячейку с названием квартала
            quarterRow.innerHTML = `<td>${quarterNames[quarter]}</td>`;
            
            // Добавляем ячейки для каждой метрики
            metrics.forEach(metric => {
                // Находим плановое значение для этого квартала и этой метрики
                const planValue = metric.planValues.find(plan => 
                    plan.period_id === quarterPeriod.id
                );
                
                // Значения по умолчанию, если данных нет
                const planVal = planValue ? parseFloat(planValue.value) : 0;
                
                // Вычисляем сумму фактических значений для месяцев этого квартала
                const quarterMonthIds = quarterMonths[quarter].map(m => m.id);
                const quarterFactValues = metric.actualValues.filter(actual => 
                    quarterMonthIds.includes(actual.period_id)
                );
                
                const factVal = quarterFactValues.reduce((sum, actual) => sum + parseFloat(actual.value), 0);
                
                // Рассчитываем отклонение
                const diff = planVal - factVal; // Изменение: план минус факт, а не факт минус план
                const diffPercentage = planVal > 0 
                    ? ((planVal - factVal) / planVal * 100).toFixed(1) 
                    : 0;
                
                // Для расходов: позитивно - если факт меньше плана (экономия), негативно - если факт больше плана (перерасход)
                const diffClass = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : '');
                
                // Форматируем отклонение с явным знаком + или -
                const formattedDiff = diff > 0 
                    ? `+${formatNumber(Math.abs(diff))}` 
                    : formatNumber(diff);
                
                // Для кварталов
                // Форматируем процент отклонения с явным знаком + или -
                const formattedDiffPercentage = diff > 0 
                    ? `+${Math.abs(diffPercentage)}` 
                    : (diff < 0 ? `-${Math.abs(diffPercentage)}` : '0');
                
                // Формируем ячейки для плана, факта и отклонения
                const planCell = `<td data-sort-value="${planVal}">
                    ${formatNumber(planVal)} ${metric.unit}
                    ${userHasAdminRights ? `
                    <button type="button" class="edit-value-btn edit-plan-btn" data-metric-id="${metric.id}" data-period-id="${quarterPeriod.id}" data-value="${planVal}" data-type="plan" title="Редактировать план">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    ` : ''}
                </td>`;
                
                // Для фактического значения показываем итоги по месяцам квартала, без возможности редактирования
                const factCell = factVal !== null && factVal !== 0
                    ? `<td data-sort-value="${factVal}">
                        ${formatNumber(factVal)} ${metric.unit}
                      </td>` 
                    : `<td class="empty-value">—</td>`;
                
                const diffCell = factVal !== null && factVal !== 0
                    ? `<td class="${diffClass}" data-sort-value="${diff}">${formattedDiff} ${metric.unit} (${formattedDiffPercentage}%)</td>` 
                    : `<td class="empty-value">—</td>`;
                
                // Добавляем ячейки в строку
                quarterRow.innerHTML += planCell + factCell + diffCell;
            });
            
            // Добавляем строку квартала в таблицу
            tableBody.appendChild(quarterRow);
        }
        
        // Добавляем строки для месяцев текущего квартала
        quarterMonths[quarter].forEach(period => {
            const row = document.createElement('tr');
            row.className = 'month-row';
            
            // Добавляем ячейку с названием периода
            row.innerHTML = `<td>${monthNames[period.month]}</td>`;
            
            // Добавляем ячейки для каждой метрики
            metrics.forEach(metric => {
                // Находим плановое значение для этого периода и этой метрики
                const planValue = metric.planValues.find(plan => 
                    plan.period_id === period.id
                );
                
                // Находим фактическое значение для этого периода и этой метрики
                const actualValue = metric.actualValues.find(actual => 
                    actual.period_id === period.id
                );
                
                // Значения по умолчанию, если данных нет
                const planVal = planValue ? parseFloat(planValue.value) : 0;
                const factVal = actualValue ? parseFloat(actualValue.value) : null;
                
                // Рассчитываем отклонение, если есть фактическое значение
                let diff = 0;
                let diffPercentage = 0;
                let diffClass = '';
                let formattedDiff = '';
                let formattedDiffPercentage = '';
                
                if (factVal !== null) {
                    diff = planVal - factVal; // Изменение: план минус факт
                    diffPercentage = planVal > 0 
                        ? ((planVal - factVal) / planVal * 100).toFixed(1) 
                        : 0;
                    
                    // Для расходов: позитивно - если факт меньше плана (экономия), негативно - если факт больше плана (перерасход)
                    diffClass = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : '');
                    
                    // Форматируем отклонение с явным знаком + или -
                    formattedDiff = diff > 0 
                        ? `+${formatNumber(Math.abs(diff))}` 
                        : formatNumber(diff);
                    
                    // Форматируем процент отклонения с явным знаком + или -
                    formattedDiffPercentage = diff > 0 
                        ? `+${Math.abs(diffPercentage)}` 
                        : (diff < 0 ? `-${Math.abs(diffPercentage)}` : '0');
                }
                
                // Формируем ячейки для плана, факта и отклонения
                const planCell = `<td data-sort-value="${planVal}">
                    ${formatNumber(planVal)} ${metric.unit}
                    ${userHasAdminRights ? `
                    <button type="button" class="edit-value-btn edit-plan-btn" data-metric-id="${metric.id}" data-period-id="${period.id}" data-value="${planVal}" data-type="plan" title="Редактировать план">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    ` : ''}
                </td>`;
                
                const factCell = factVal !== null && factVal !== 0
                    ? `<td data-sort-value="${factVal}">
                        ${formatNumber(factVal)} ${metric.unit}
                        ${userHasAdminRights ? `
                        <button type="button" class="edit-value-btn edit-fact-btn" data-metric-id="${metric.id}" data-period-id="${period.id}" data-value="${factVal}" data-type="fact" title="Редактировать факт">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </button>
                        ` : ''}
                      </td>` 
                    : `<td class="empty-value">
                        ${userHasAdminRights ? `
                            <button type="button" class="add-fact-btn" data-metric-id="${metric.id}" data-period-id="${period.id}" data-period-month="${period.month}">
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                                Внести факт
                            </button>
                        ` : '—'}
                          </td>`;
                
                const diffCell = factVal !== null && factVal !== 0
                    ? `<td class="${diffClass}" data-sort-value="${diff}">${formattedDiff} ${metric.unit} (${formattedDiffPercentage}%)</td>` 
                    : `<td class="empty-value">—</td>`;
                
                // Добавляем ячейки в строку
                row.innerHTML += planCell + factCell + diffCell;
            });
            
            // Добавляем строку в тело таблицы
            tableBody.appendChild(row);
        });
    }
    
    // Добавим стили для строк кварталов
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .quarter-row {
            background-color: var(--background-secondary);
            font-weight: 500;
        }
        .quarter-row td:first-child {
            font-weight: 600;
        }
        .month-row td:first-child {
            padding-left: 20px;
        }
        
        /* Улучшенные стили для кнопок редактирования */
        .edit-value-btn {
            background: rgba(0, 0, 0, 0.05);
            border: none;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s ease, background 0.2s ease;
            margin-left: 5px;
            padding: 4px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            vertical-align: middle;
            position: relative;
            z-index: 10;
        }
        
        .edit-value-btn:hover {
            opacity: 1;
            background: rgba(0, 0, 0, 0.1);
        }
        
        .edit-plan-btn svg {
            color: #2196F3;
        }
        
        .edit-fact-btn svg {
            color: #4caf50;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Обновляем итоговую строку (вызываем асинхронно)
    updateTotalRow(metrics, monthPeriods).catch(error => {
        console.error('Ошибка при обновлении итоговой строки:', error);
    });
    
    // Добавляем обработчики для кнопок добавления фактических значений
    document.querySelectorAll('.add-fact-btn').forEach(button => {
        button.addEventListener('click', function() {
            const metricId = this.dataset.metricId;
            const periodId = this.dataset.periodId;
            const periodMonth = this.dataset.periodMonth;
            const periodQuarter = this.dataset.periodQuarter;
            
            console.log('Нажата кнопка добавления факта:', {
                metricId,
                periodId,
                periodMonth,
                periodQuarter
            });
            
            // Открываем модальное окно для добавления фактического значения
            const modal = document.getElementById('add-fact-modal');
            if (modal) {
                // Сбрасываем все поля формы
                document.getElementById('fact-form').reset();
                document.getElementById('fact-value').value = '';
                document.getElementById('plan-value-display').textContent = '—';
                document.getElementById('plan-value-display').setAttribute('data-value', '0');
                
                // Устанавливаем выбранную метрику и период
                document.getElementById('metric-select').value = metricId;
                document.getElementById('metric-id').value = metricId;
                
                // Определяем, какой тип периода используется (месяц или квартал)
                if (periodMonth) {
                    // Если доступен месяц, выбираем его в селекте
                document.getElementById('period-select').value = periodMonth;
                    
                    // Если period-id существует, установим его
                    if (periodId) {
                document.getElementById('period-id').value = periodId;
                    } else {
                        // Иначе используем виртуальный ID
                        const currentYear = new Date().getFullYear();
                        document.getElementById('period-id').value = `month-${currentYear}-${periodMonth}`;
                    }
                } else if (periodQuarter) {
                    // Если доступен квартал, выбираем первый месяц квартала
                    const quarterNum = parseInt(periodQuarter);
                    const firstMonthOfQuarter = (quarterNum - 1) * 3 + 1;
                    document.getElementById('period-select').value = firstMonthOfQuarter;
                    
                    // Если period-id существует, установим его
                    if (periodId) {
                        document.getElementById('period-id').value = periodId;
                    } else {
                        // Иначе используем виртуальный ID для первого месяца квартала
                        const currentYear = new Date().getFullYear();
                        document.getElementById('period-id').value = `month-${currentYear}-${firstMonthOfQuarter}`;
                    }
                }
                
                // Вызываем событие изменения, чтобы загрузить плановое значение
                document.getElementById('metric-select').dispatchEvent(new Event('change'));
                
                // Показываем модальное окно
                modal.classList.add('active');
                console.log('Открыто модальное окно с параметрами:', {
                    metricId: document.getElementById('metric-id').value,
                    periodId: document.getElementById('period-id').value,
                    period: document.getElementById('period-select').value
                });
            } else {
                showNotification('Модальное окно для добавления значений не найдено', 'error');
            }
        });
    });
    
    // Настраиваем обработчики для кнопок редактирования
    setupEditButtons();
    
    // Настраиваем сортировку таблицы
    setupTableSorting();
}

// Функция для обновления заголовков метрик
function updateMetricHeaders(metrics) {
    // Получаем строки заголовков
    const headerRow = document.querySelector('.salary-table thead tr:first-child');
    const subHeaderRow = document.querySelector('.salary-table thead tr.sub-header');
    
    // Очищаем заголовки, оставляя первую ячейку
    headerRow.innerHTML = '<th rowspan="2">Период</th>';
    subHeaderRow.innerHTML = ''; // Первая ячейка уже занята rowspan
    
    // Добавляем заголовки для каждой метрики
    metrics.forEach((metric, index) => {
        // Заголовок метрики
        const headerCell = document.createElement('th');
        headerCell.setAttribute('colspan', '3');
        headerCell.className = 'metric-header';
        headerCell.id = `metric-header-${index + 1}`;
        headerCell.textContent = `${metric.name} (${metric.unit})`;
        headerRow.appendChild(headerCell);
        
        // Подзаголовки (План, Факт, Отклонение) без классов sortable
        const planCell = document.createElement('td');
        planCell.textContent = 'План';
        subHeaderRow.appendChild(planCell);
        
        const factCell = document.createElement('td');
        factCell.textContent = 'Факт';
        subHeaderRow.appendChild(factCell);
        
        const diffCell = document.createElement('td');
        diffCell.textContent = 'Отклонение';
        subHeaderRow.appendChild(diffCell);
    });
}

// Функция для обновления итоговой строки
async function updateTotalRow(metrics, monthPeriods) {
    const totalRow = document.querySelector('.salary-table tfoot .total-row');
    
    // Очищаем итоговую строку, оставляя первую ячейку
    totalRow.innerHTML = '<td>Итого:</td>';
    
    // Показываем индикатор загрузки
    showLoading();
    
    // Получаем магазин из параметров URL
    const shopId = getUrlParams().storeId;
    
    // Массив для хранения обещаний для каждой метрики
    const metricPromises = metrics.map(async (metric) => {
        // Находим годовое плановое значение для текущего года
        const yearlyPlanValue = metric.planValues.find(plan => 
            // Период должен быть годовым (без месяца и квартала)
            plan.period && plan.period.month === null && plan.period.quarter === null
        );
        
        // Используем годовое значение или суммируем по месяцам, если не найдено
        let totalPlan = yearlyPlanValue ? parseFloat(yearlyPlanValue.value) : 0;
        
        // Если годовое значение не найдено в метрике, суммируем по месяцам
        if (totalPlan === 0) {
            // Суммируем все месячные плановые значения
            totalPlan = metric.planValues
                .filter(pv => pv.period && pv.period.month !== null)
                .reduce((sum, pv) => sum + parseFloat(pv.value), 0);
            
            console.log(`Рассчитано годовое значение плана по месяцам: ${totalPlan}`);
        }
        
        // Суммируем фактические значения
        const totalFact = metric.actualValues.reduce((sum, actual) => sum + parseFloat(actual.value), 0);
        
        // Вычисляем разницу (план - факт)
        const totalDiff = totalPlan - totalFact;
        
        // Вычисляем процент отклонения
        const diffPercentage = totalPlan > 0 
            ? ((totalPlan - totalFact) / totalPlan * 100).toFixed(1) 
            : 0;
        
        // Для расходов: позитивно - если факт меньше плана (экономия), негативно - если факт больше плана (перерасход)
        const diffClass = totalDiff > 0 ? 'positive' : (totalDiff < 0 ? 'negative' : '');
        
        // Форматируем отклонение с явным знаком + или -
        const formattedDiff = totalDiff > 0 
            ? `+${formatNumber(Math.abs(totalDiff))}` 
            : formatNumber(totalDiff);
        
        // Форматируем процент отклонения с явным знаком + или -
        const formattedDiffPercentage = totalDiff > 0 
            ? `+${Math.abs(diffPercentage)}` 
            : (totalDiff < 0 ? `-${Math.abs(diffPercentage)}` : '0');
        
        // Возвращаем HTML для ячеек итогов
        const factCellContent = totalFact !== 0 
            ? `${formatNumber(totalFact)} ${metric.unit}` 
            : '—';
        
        const diffCellContent = totalFact !== 0 
            ? `${formattedDiff} ${metric.unit} (${formattedDiffPercentage}%)` 
            : '—';
        
        return `
            <td>${formatNumber(totalPlan)} ${metric.unit}</td>
            <td>${factCellContent}</td>
            <td class="${totalFact !== 0 ? diffClass : 'empty-value'}">${diffCellContent}</td>
        `;
    });
    
    // Дожидаемся всех запросов
    const results = await Promise.all(metricPromises);
    
    // Добавляем все ячейки в итоговую строку
    totalRow.innerHTML += results.join('');
    
    // Скрываем индикатор загрузки
    hideLoading();
}

// Функция для настройки обработчиков кнопок редактирования
function setupEditButtons() {
    console.log('Настройка обработчиков кнопок редактирования');
    
    // Если у пользователя нет прав администратора, не добавляем обработчики
    if (!userHasAdminRights) {
        console.log('Пропуск добавления обработчиков редактирования - нет прав');
        return;
    }
    
    // Удаляем старые обработчики, добавив класс handled
    document.querySelectorAll('.edit-plan-btn.handled, .edit-fact-btn.handled').forEach(button => {
        button.classList.remove('handled');
    });
    
    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll('.edit-plan-btn:not(.handled), .edit-fact-btn:not(.handled)').forEach(button => {
        // Помечаем кнопки, для которых добавлены обработчики
        button.classList.add('handled');
        
        button.addEventListener('click', function(event) {
            // Предотвращаем всплытие события
            event.preventDefault();
            event.stopPropagation();
            
            const metricId = this.dataset.metricId;
            const periodId = this.dataset.periodId;
            const valueType = this.dataset.type;
            const currentValue = this.dataset.value;
            
            // Открываем модальное окно для редактирования значения
            const modal = document.getElementById('edit-value-modal');
            
            if (modal) {
                try {
                    showLoading();
                    
                    // Используем только кэшированные данные
                    let metricName = '';
                    let unit = '';
                    let periodName = 'Неизвестный период';
                    
                    // Получаем данные о метрике из кэша
                    const loadedMetrics = window.loadedMetricsData || [];
                    if (loadedMetrics.length > 0) {
                        const metric = loadedMetrics.find(m => m.id === metricId);
                        if (metric) {
                            metricName = metric.name;
                            unit = metric.unit;
                        }
                    }
                    
                    // Определяем название периода из ID
                    if (periodId.startsWith('year-')) {
                        const year = parseInt(periodId.split('-')[1]);
                        periodName = `Год ${year}`;
                    }
                    else if (periodId.startsWith('quarter-')) {
                        const parts = periodId.split('-');
                        const year = parseInt(parts[1]);
                        const quarter = parseInt(parts[2]);
                        const quarterNames = {
                            1: 'I квартал', 2: 'II квартал', 3: 'III квартал', 4: 'IV квартал'
                        };
                        periodName = `${quarterNames[quarter]} ${year}`;
                    }
                    else if (periodId.startsWith('month-')) {
                        const parts = periodId.split('-');
                        const year = parseInt(parts[1]);
                        const month = parseInt(parts[2]);
                            const monthNames = {
                                1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
                                7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
                            };
                        periodName = `${monthNames[month]} ${year}`;
                    }
                    
                    // Заполняем форму
                    document.getElementById('edit-metric-id').value = metricId;
                    document.getElementById('edit-period-id').value = periodId;
                    document.getElementById('edit-value-type').value = valueType;
                    document.getElementById('edit-metric-name').textContent = `${metricName} (${unit})`;
                    document.getElementById('edit-period-name').textContent = periodName;
                    document.getElementById('edit-value').value = currentValue;
                    
                    // Показываем/скрываем опцию пересчета в зависимости от типа значения
                    const recalculateContainer = document.getElementById('recalculate-container');
                    if (valueType === 'fact' && periodId.startsWith('month-')) {
                        recalculateContainer.style.display = 'block';
                    } else {
                        recalculateContainer.style.display = 'none';
                    }
                    
                    hideLoading();
                    
                    // Показываем модальное окно
                    modal.classList.add('active');
                } catch (error) {
                    hideLoading();
                    showNotification(`Ошибка при загрузке данных: ${error.message}`, 'error');
                }
            } else {
                showNotification('Модальное окно для редактирования значений не найдено', 'error');
            }
        });
    });
    
    // Добавляем обработчики для кнопок добавления фактических значений
    document.querySelectorAll('.add-fact-btn:not(.handled)').forEach(button => {
        button.classList.add('handled');
        
        button.addEventListener('click', function() {
            const metricId = this.dataset.metricId;
            const periodId = this.dataset.periodId;
            const periodMonth = this.dataset.periodMonth;
            
            // Открываем модальное окно для добавления фактического значения
            const modal = document.getElementById('add-fact-modal');
            if (modal) {
                // Сбрасываем все поля формы
                document.getElementById('fact-form').reset();
                document.getElementById('fact-value').value = '';
                document.getElementById('plan-value-display').textContent = '—';
                document.getElementById('plan-value-display').setAttribute('data-value', '0');
                
                // Устанавливаем выбранную метрику и период
                document.getElementById('metric-select').value = metricId;
                document.getElementById('metric-id').value = metricId;
                document.getElementById('period-select').value = periodMonth;
                document.getElementById('period-id').value = periodId;
                
                // Вызываем событие изменения метрики для загрузки плановых значений
                document.getElementById('metric-select').dispatchEvent(new Event('change'));
                
                // Показываем модальное окно
                modal.classList.add('active');
            } else {
                showNotification('Модальное окно для добавления фактических значений не найдено', 'error');
            }
        });
    });
} 
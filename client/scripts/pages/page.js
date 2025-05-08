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
                headers: this.headers
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
}

// Создаем экземпляр ApiClient
const apiClient = new ApiClient('http://localhost:8000/api/v1');

// Получение параметров из URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        categoryId: params.get('category') || '',
        storeId: params.get('store') || ''
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

// Функция форматирования валюты
function formatCurrency(number) {
    return new Intl.NumberFormat('ru-RU', { style: 'decimal' }).format(number) + ' ₽';
}

// Функция форматирования валюты в сокращенном формате
function formatShortCurrency(number) {
    if (number >= 100000) {
        return (number / 1000).toFixed(0) + 'K';
    }
    return number.toString();
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
            const period = parseInt(document.getElementById('period-select').value);
            const periodId = document.getElementById('period-id').value;
            const factValue = parseFloat(document.getElementById('fact-value').value);
            const recalculatePlan = document.getElementById('recalculate-plan').checked;
            const planValue = parseFloat(document.getElementById('plan-value-display').getAttribute('data-value') || 0);
            
            try {
                showLoading();
                
                // Создаем объект с актуальным фактическим значением
                const actualValueData = {
                    metric_id: metricId,
                    shop_id: getUrlParams().storeId,
                    value: factValue,
                    period_id: periodId
                };
                
                // Если period-id не установлен, получаем или создаем период
                if (!periodId) {
                    // Получаем текущий год
                    const currentYear = new Date().getFullYear();
                    
                    // Сначала создаем период для фактического значения (если он не существует)
                    const periodResponse = await apiClient.get(`/finance/periods?year=${currentYear}&month=${period}`);
                    
                    let newPeriodId;
                    if (periodResponse.length > 0) {
                        newPeriodId = periodResponse[0].id;
                    } else {
                        // Создаем новый период
                        const quarter = Math.ceil(period / 3);
                        const newPeriod = await apiClient.post('/finance/periods', {
                            year: currentYear,
                            quarter: quarter,
                            month: period
                        });
                        newPeriodId = newPeriod.id;
                    }
                    
                    // Добавляем идентификатор периода в данные
                    actualValueData.period_id = newPeriodId;
                }
                
                // Создаем фактическое значение
                await apiClient.post('/finance/actual-values', actualValueData);
                
                // Если нужно пересчитать план на оставшиеся месяцы
                if (recalculatePlan && planValue !== factValue) {
                    const currentYear = new Date().getFullYear();
                    
                    // Отправляем запрос на пересчет плана
                    await apiClient.postWithParams('/finance/plan-values/recalculate-with-actual', {
                        metric_id: metricId,
                        shop_id: getUrlParams().storeId,
                        year: currentYear,
                        actual_month: period,
                        actual_value: factValue
                    });
                    
                    showNotification('Значение добавлено и план пересчитан', 'success');
                } else {
                    showNotification('Значение успешно добавлено', 'success');
                }
                
                hideLoading();
                document.getElementById('add-fact-modal').classList.remove('active');
                
                // Обновляем таблицу метрик
                await loadMetrics();
                
            } catch (error) {
                hideLoading();
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
            
            // Получаем текущий год
            const currentYear = new Date().getFullYear();
            console.log(`Загрузка планового значения для метрики ${metricId}, период: год ${currentYear}, месяц ${periodMonth}`);
            
            // Получаем период для месяца (если он существует)
            const periodResponse = await apiClient.get(`/finance/periods?year=${currentYear}&month=${periodMonth}`);
            console.log('Ответ API по периодам:', periodResponse);
            
            let planValue = 0;
            let periodId = '';
            
            // Получаем магазин из параметров URL
            const shopId = getUrlParams().storeId;
            console.log(`ID магазина: ${shopId}`);
            
            // 1. Пытаемся найти плановое значение для выбранного месяца
            if (periodResponse && periodResponse.length > 0) {
                periodId = periodResponse[0].id;
                console.log(`Найден период с ID: ${periodId}`);
                document.getElementById('period-id').value = periodId;
                
                // Запрос на получение плановых значений с явными параметрами
                const planValuesUrl = `/finance/plan-values?metric_id=${metricId}&shop_id=${shopId}&period_id=${periodId}`;
                console.log(`Запрос плановых значений: ${planValuesUrl}`);
                
                const planValues = await apiClient.get(planValuesUrl);
                console.log('Ответ API по плановым значениям для месяца:', planValues);
                
                if (planValues && planValues.length > 0) {
                    planValue = parseFloat(planValues[0].value);
                    console.log(`Найдено плановое значение для месяца: ${planValue}`);
                } else {
                    console.log('Плановое значение для месяца не найдено, ищем годовое значение');
                    
                    // 2. Если для месяца нет планового значения, ищем годовое
                    const yearlyValue = await getYearlyPlanValue(metricId, shopId);
                    if (yearlyValue > 0) {
                        // Делим годовое значение на 12 для получения месячного
                        planValue = yearlyValue / 12;
                        console.log(`Годовое плановое значение: ${yearlyValue}, для месяца: ${planValue}`);
                    }
                }
            } else {
                console.log(`Период для года ${currentYear} и месяца ${periodMonth} не найден в API`);
                
                // Даже если период для месяца не найден, попробуем получить годовое значение
                const yearlyValue = await getYearlyPlanValue(metricId, shopId);
                if (yearlyValue > 0) {
                    // Делим годовое значение на 12 для получения месячного
                    planValue = yearlyValue / 12;
                    console.log(`Годовое плановое значение: ${yearlyValue}, для месяца: ${planValue}`);
                }
            }
            
            // Получаем единицу измерения метрики
            const metricResponse = await apiClient.get(`/finance/metrics/${metricId}`);
            console.log('Ответ API по метрике:', metricResponse);
            const unit = metricResponse && metricResponse.unit ? metricResponse.unit : '';
            
            console.log(`Обновляем отображение планового значения: ${planValue} ${unit}`);
            
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
            
            console.log('Сохраняем редактируемое значение:', {
                metricId,
                periodId,
                valueType,
                newValue,
                recalculatePlan
            });
            
            try {
                showLoading();
                
                // Выполняем редактирование значения через API
                const endpoint = valueType === 'plan' 
                    ? `/finance/plan-values?metric_id=${metricId}&period_id=${periodId}`
                    : `/finance/actual-values?metric_id=${metricId}&period_id=${periodId}`;
                
                console.log(`Запрашиваем существующее значение через: ${endpoint}`);
                
                // Получаем существующее значение для редактирования
                const values = await apiClient.get(endpoint);
                console.log('Получены значения:', values);
                
                if (values.length > 0) {
                    const valueId = values[0].id;
                    const updateEndpoint = valueType === 'plan' 
                        ? `/finance/plan-values/${valueId}`
                        : `/finance/actual-values/${valueId}`;
                    
                    console.log(`Отправляем обновление на: ${updateEndpoint}`, { value: newValue });
                    
                    // Обновляем значение
                    await apiClient.put(updateEndpoint, { value: newValue });
                    
                    // Если это фактическое значение и нужно пересчитать план
                    if (valueType === 'fact' && recalculatePlan) {
                        // Получаем текущий год и месяц из периода
                        const periodData = await apiClient.get(`/finance/periods/${periodId}`);
                        console.log('Данные о периоде:', periodData);
                        
                        if (periodData && periodData.month) {
                            const currentYear = periodData.year || new Date().getFullYear();
                            
                            // Отправляем запрос на пересчет плана
                            await apiClient.postWithParams('/finance/plan-values/recalculate-with-actual', {
                                metric_id: metricId,
                                shop_id: getUrlParams().storeId,
                                year: currentYear,
                                actual_month: periodData.month,
                                actual_value: newValue
                            });
                            
                            showNotification('Значение обновлено и план пересчитан', 'success');
                        } else {
                            showNotification('Значение успешно обновлено', 'success');
                        }
                    } else {
                        showNotification('Значение успешно обновлено', 'success');
                    }
                } else {
                    throw new Error(`Значение не найдено`);
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

// Загрузка данных о категории и магазине
async function loadCategoryAndStore() {
    try {
        const { categoryId, storeId } = getUrlParams();
        
        if (!categoryId || !storeId) {
            showNotification('Не указаны параметры категории или магазина в URL. Проверьте ссылку, по которой вы перешли.', 'error');
            return;
        }
        
        showLoading();
        
        try {
            // Получаем данные о категории
            const category = await apiClient.get(`/finance/categories/${categoryId}`);
            
            // Получаем данные о магазине
            const store = await apiClient.get(`/finance/shops/${storeId}`);
            
            // Обновляем заголовки на странице
            document.querySelector('.breadcrumb-item.active').textContent = category.name;
            document.querySelector('.salary-report__title').textContent = category.name;
            document.querySelector('.salary-report__subtitle').textContent = store.name;
            
            // Обновляем заголовок страницы
            document.title = `${category.name} | ${store.name} | RealTimeFinanceAnalytics`;
            
            hideLoading();
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            hideLoading();
            
            // Проверяем, какой запрос вызвал ошибку и выводим соответствующее сообщение
            if (error.message.includes('categories')) {
                showNotification(`Категория с ID ${categoryId} не найдена. Пожалуйста, вернитесь на главную страницу и выберите категорию снова.`, 'error');
            } else if (error.message.includes('shops')) {
                showNotification(`Магазин с ID ${storeId} не найден. Пожалуйста, вернитесь на главную страницу и выберите магазин снова.`, 'error');
            } else {
                showNotification('Ошибка при загрузке данных: ' + error.message, 'error');
            }
        }
    } catch (error) {
        hideLoading();
        showNotification('Ошибка при обработке параметров URL: ' + error.message, 'error');
    }
}

// Функция для добавления кнопок действий для метрик
function addMetricActionButtons(metrics) {
    // Создаем контейнер для кнопок, если его нет
    let actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) {
        actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        // Добавляем кнопку для добавления новой метрики
        actionButtons.innerHTML = `
            <button class="btn btn-primary" id="add-metric-btn">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Добавить метрику
            </button>
        `;
        
        // Добавляем контейнер перед таблицей
        const tableContainer = document.querySelector('.salary-table-container');
        tableContainer.parentNode.insertBefore(actionButtons, tableContainer);
        
        // Добавляем обработчик для кнопки добавления метрики
        document.getElementById('add-metric-btn').addEventListener('click', () => {
            document.getElementById('add-metric-modal').classList.add('active');
        });
    }
    
    // Добавляем кнопку для добавления годового плана
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
        button.addEventListener('click', function() {
            // Проверяем, существует ли модальное окно
            let modal = document.getElementById('yearly-plan-modal');
            if (!modal) {
                createYearlyPlanModal();
                modal = document.getElementById('yearly-plan-modal');
            }
            
            // Показываем модальное окно
            modal.classList.add('active');
        });
        
        actionButtons.appendChild(button);
    }
    
    // Добавляем кнопку для инициализации периодов (только для администратора или разработчика)
    const initPeriodsBtn = document.getElementById('init-periods-btn');
    if (!initPeriodsBtn) {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.id = 'init-periods-btn';
        button.style.marginLeft = 'auto'; // Добавляем отступ слева, чтобы кнопка была справа
        button.innerHTML = `
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Инициализировать периоды
        `;
        
        // Добавляем обработчик для кнопки
        button.addEventListener('click', function() {
            initializePeriods();
        });
        
        actionButtons.appendChild(button);
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

// Добавление кнопок действий
function addActionButtons() {
    // Создаем контейнер для кнопок
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    actionButtons.innerHTML = `
        <button class="btn btn-primary" id="add-metric-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Добавить метрику
        </button>
        <button class="btn btn-secondary" id="init-periods-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-3"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11v6M9 11h6"></path>
            </svg>
            Инициализировать периоды
        </button>
    `;
    
    // Добавляем контейнер перед таблицей
    const tableContainer = document.querySelector('.salary-table-container');
    tableContainer.parentNode.insertBefore(actionButtons, tableContainer);
    
    // Добавляем обработчик для кнопки добавления метрики
    document.getElementById('add-metric-btn').addEventListener('click', () => {
        document.getElementById('add-metric-modal').classList.add('active');
    });
    
    // Добавляем обработчик для кнопки инициализации периодов
    document.getElementById('init-periods-btn').addEventListener('click', async () => {
        if (confirm('Вы уверены, что хотите инициализировать периоды для текущего года? Это действие создаст периоды для года, кварталов и месяцев, если они еще не существуют.')) {
            await initializePeriods();
        }
    });
}

// Модификация заголовков таблицы
function updateTableHeaders() {
    // Для этой структуры не нужно менять заголовки в HTML, 
    // теперь будем обновлять их динамически при рендеринге метрик
}

// Обработчик сортировки таблицы
function setupTableSorting() {
    // Функция будет добавлять обработчики сортировки после создания заголовков таблицы
    // Поэтому вызываем её после обновления заголовков в renderMetricsTable
    
    document.querySelectorAll('.sortable').forEach(header => {
        // Добавляем иконку сортировки
        header.innerHTML += ' <span class="sort-icon">⇵</span>';
        
        header.addEventListener('click', function() {
            const sortKey = this.dataset.sort;
            const currentDirection = this.getAttribute('data-direction') || 'asc';
            const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            
            // Сбрасываем все направления
            document.querySelectorAll('.sortable').forEach(h => {
                h.removeAttribute('data-direction');
                const icon = h.querySelector('.sort-icon');
                if (icon) icon.textContent = '⇵';
            });
            
            // Устанавливаем новое направление и иконку
            this.setAttribute('data-direction', newDirection);
            const icon = this.querySelector('.sort-icon');
            if (icon) icon.textContent = newDirection === 'asc' ? '↑' : '↓';
            
            // Выполняем сортировку таблицы по выбранному столбцу
            sortTable(sortKey, newDirection);
        });
    });
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
function createYearlyPlanModal() {
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
                                <option value="">Выберите метрику</option>
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

    // Заполнение выпадающего списка метрик
    apiClient.get(`/finance/metrics?category_id=${getUrlParams().categoryId}`)
        .then(metrics => {
            const select = document.getElementById('yearly-metric-select');
            metrics.forEach(metric => {
                const option = document.createElement('option');
                option.value = metric.id;
                option.textContent = `${metric.name} (${metric.unit})`;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке метрик:', error);
        });

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

// Функция для инициализации периодов
async function initializePeriods() {
    try {
        showLoading();
        
        // Получаем текущий год
        const currentYear = new Date().getFullYear();
        
        // Создаем период для года
        const yearPeriod = await apiClient.post('/finance/periods', {
            year: currentYear
        });
        
        // Создаем периоды для кварталов
        const quarterPeriods = [];
        for (let quarter = 1; quarter <= 4; quarter++) {
            const quarterPeriod = await apiClient.post('/finance/periods', {
                year: currentYear,
                quarter: quarter
            });
            quarterPeriods.push(quarterPeriod);
        }
        
        // Создаем периоды для месяцев
        const monthPeriods = [];
        for (let quarter = 1; quarter <= 4; quarter++) {
            for (let monthInQuarter = 1; monthInQuarter <= 3; monthInQuarter++) {
                const monthNum = (quarter - 1) * 3 + monthInQuarter;
                const monthPeriod = await apiClient.post('/finance/periods', {
                    year: currentYear,
                    quarter: quarter,
                    month: monthNum
                });
                monthPeriods.push(monthPeriod);
            }
        }
        
        hideLoading();
        showNotification(`Периоды успешно созданы: 1 год, ${quarterPeriods.length} кварталов, ${monthPeriods.length} месяцев`, 'success');
        
        // Перезагружаем метрики с новыми периодами
        await loadMetrics();
        
    } catch (error) {
        hideLoading();
        console.error('Ошибка при инициализации периодов:', error);
        showNotification('Ошибка при инициализации периодов: ' + error.message, 'error');
    }
}

// Функция для получения годового планового значения метрики
async function getYearlyPlanValue(metricId, shopId) {
    try {
        // Получаем текущий год
        const currentYear = new Date().getFullYear();
        
        // Получаем годовой период
        const yearPeriodResponse = await apiClient.get(`/finance/periods?year=${currentYear}&period_type=year`);
        console.log('Ответ API по годовому периоду:', yearPeriodResponse);
        
        if (yearPeriodResponse && yearPeriodResponse.length > 0) {
            const yearPeriodId = yearPeriodResponse[0].id;
            
            // Запрос на получение годового планового значения
            const yearlyPlanValuesUrl = `/finance/plan-values?metric_id=${metricId}&shop_id=${shopId}&period_id=${yearPeriodId}`;
            console.log(`Запрос годовых плановых значений: ${yearlyPlanValuesUrl}`);
            
            const yearlyPlanValues = await apiClient.get(yearlyPlanValuesUrl);
            console.log('Ответ API по годовым плановым значениям:', yearlyPlanValues);
            
            if (yearlyPlanValues && yearlyPlanValues.length > 0) {
                const yearlyValue = parseFloat(yearlyPlanValues[0].value);
                console.log(`Найдено годовое плановое значение: ${yearlyValue}`);
                return yearlyValue;
            }
        }
        
        console.log('Годовое плановое значение не найдено');
        return 0;
    } catch (error) {
        console.error('Ошибка при получении годового планового значения:', error);
        return 0;
    }
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
                            <div class="chart-bar chart-bar--plan" style="height: ${(item.plan / maxValue * 100)}%" data-label="План: ${formatNumber(item.plan)} ${currentMetric.unit}">
                                <div class="chart-bar-value">${formatNumber(item.plan)}</div>
                            </div>
                            <div class="chart-bar chart-bar--fact" style="height: ${(item.fact / maxValue * 100)}%" data-label="Факт: ${formatNumber(item.fact)} ${currentMetric.unit}">
                                <div class="chart-bar-value">${formatNumber(item.fact)}</div>
                            </div>
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
                    margin-top: 10px;
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
                    z-index: 10;
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
async function loadMetrics() {
    try {
        const { categoryId, storeId } = getUrlParams();
        
        if (!categoryId || !storeId) {
            return;
        }
        
        showLoading();
        
        // Получаем метрики для выбранной категории
        const metrics = await apiClient.get(`/finance/metrics?category_id=${categoryId}`);
        
        // Получаем текущий год
        const currentYear = new Date().getFullYear();
        
        // Получаем все периоды для текущего года с месяцами
        const monthPeriods = await apiClient.get(`/finance/periods?year=${currentYear}&period_type=month`);
        
        // Получаем все периоды для текущего года с кварталами
        const quarterPeriods = await apiClient.get(`/finance/periods?year=${currentYear}&period_type=quarter`);
        
        // Получаем годовой период для текущего года
        const yearPeriods = await apiClient.get(`/finance/periods?year=${currentYear}&period_type=year`);
        console.log('Годовой период:', yearPeriods);
        
        // Проверяем, что есть периоды для всех месяцев и кварталов
        if (monthPeriods.length === 0 || quarterPeriods.length === 0 || yearPeriods.length === 0) {
            hideLoading();
            if (confirm('Не найдены периоды для текущего года. Хотите инициализировать периоды?')) {
                await initializePeriods();
                return;
            }
        }
        
        // Объединяем периоды
        const periods = [...monthPeriods, ...quarterPeriods, ...yearPeriods];
        
        console.log('Загруженные периоды:', periods);
        console.log('Месячные периоды:', monthPeriods.length);
        console.log('Квартальные периоды:', quarterPeriods.length);
        
        // Получаем плановые значения для текущего магазина
        const planValues = await apiClient.get(`/finance/plan-values?shop_id=${storeId}`);
        
        // Получаем фактические значения для текущего магазина
        const actualValues = await apiClient.get(`/finance/actual-values?shop_id=${storeId}`);
        
        // Обогащаем данные о плановых и фактических значениях информацией о периодах
        const enrichedPlanValues = planValues.map(plan => {
            const period = periods.find(p => p.id === plan.period_id);
            return {
                ...plan,
                period
            };
        });
        
        const enrichedActualValues = actualValues.map(actual => {
            const period = periods.find(p => p.id === actual.period_id);
            return {
                ...actual,
                period
            };
        });
        
        // Добавляем к метрикам периоды с плановыми и фактическими значениями
        const metricsWithValues = metrics.map(metric => {
            const metricPlanValues = enrichedPlanValues.filter(plan => plan.metric_id === metric.id);
            const metricActualValues = enrichedActualValues.filter(actual => actual.metric_id === metric.id);
            
            return {
                ...metric,
                planValues: metricPlanValues,
                actualValues: metricActualValues
            };
        });
        
        // Обновляем таблицу метрик
        renderMetricsTable(metricsWithValues, periods);
        
        // Обновляем выпадающий список метрик в модальном окне
        updateMetricSelect(metrics);
        
        // Добавляем кнопки действий для метрик
        addMetricActionButtons(metrics);
        
        // Настраиваем графики
        setupCharts(metricsWithValues, periods);
        
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
    const { categoryId, storeId } = getUrlParams();
    
    // Если параметры отсутствуют, показываем сообщение об ошибке
    if (!categoryId || !storeId) {
        showNotification('Для просмотра отчета необходимо выбрать категорию и магазин', 'error');
        return;
    }
    
    // Создаем модальные окна
    createMetricModal();
    createFactValueModal();
    createYearlyPlanModal();
    createEditValueModal();
    
    // Добавляем кнопки действий
    addActionButtons();
    
    // Загружаем данные о категории и магазине
    await loadCategoryAndStore();
    
    // Загружаем метрики
    await loadMetrics();
    
    // Настраиваем сортировку таблицы - перемещаем после загрузки метрик
    setupTableSorting();
    
    // Настраиваем фильтры
    setupFilters();
    
    // Настраиваем кнопку экспорта
    setupExportButton();
});

// Функция настройки фильтров
function setupFilters() {
    const shopFilter = document.getElementById('shopFilter');
    if (shopFilter) {
        // Загружаем список магазинов для фильтра
        apiClient.get('/finance/shops')
            .then(shops => {
                // Очищаем список магазинов
                while (shopFilter.firstChild) {
                    shopFilter.removeChild(shopFilter.firstChild);
                }
                
                // Добавляем опцию "Все магазины"
                const allOption = document.createElement('option');
                allOption.textContent = 'Все магазины';
                allOption.value = '';
                shopFilter.appendChild(allOption);
                
                // Добавляем магазины в список
                shops.forEach(shop => {
                    if (!shop.status) return; // Пропускаем неактивные магазины
                    
                    const option = document.createElement('option');
                    option.textContent = shop.name;
                    option.value = shop.id;
                    
                    // Выбираем текущий магазин
                    if (shop.id === getUrlParams().storeId) {
                        option.selected = true;
                    }
                    
                    shopFilter.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке магазинов:', error);
            });
        
        // Добавляем обработчик изменения фильтра
        shopFilter.addEventListener('change', function() {
            if (this.value) {
                // Если выбран конкретный магазин, обновляем URL и перезагружаем страницу
                const { categoryId } = getUrlParams();
                window.location.href = `./page.html?category=${categoryId}&store=${this.value}`;
            }
        });
    }
}

// Функция настройки кнопки экспорта
function setupExportButton() {
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            showLoading();
            
            // Выполняем экспорт данных
            const { categoryId, storeId } = getUrlParams();
            
            // Здесь будет логика экспорта данных, пока показываем сообщение
            setTimeout(() => {
                hideLoading();
                showNotification('Отчет успешно экспортирован!', 'success');
            }, 1500);
        });
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
                    <button type="button" class="edit-value-btn edit-plan-btn" data-metric-id="${metric.id}" data-period-id="${quarterPeriod.id}" data-value="${planVal}" data-type="plan" title="Редактировать план">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                </td>`;
                
                // Для фактического значения показываем итоги по месяцам квартала, без возможности редактирования
                const factCell = quarterFactValues.length > 0
                    ? `<td data-sort-value="${factVal}">
                        ${formatNumber(factVal)} ${metric.unit}
                      </td>` 
                    : `<td class="empty-value">—</td>`;
                
                const diffCell = factVal !== null 
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
                    <button type="button" class="edit-value-btn edit-plan-btn" data-metric-id="${metric.id}" data-period-id="${period.id}" data-value="${planVal}" data-type="plan" title="Редактировать план">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                </td>`;
                
                const factCell = factVal !== null 
                    ? `<td data-sort-value="${factVal}">
                        ${formatNumber(factVal)} ${metric.unit}
                        <button type="button" class="edit-value-btn edit-fact-btn" data-metric-id="${metric.id}" data-period-id="${period.id}" data-value="${factVal}" data-type="fact" title="Редактировать факт">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </button>
                      </td>` 
                    : `<td class="empty-value">
                        <button type="button" class="add-fact-btn" data-metric-id="${metric.id}" data-period-id="${period.id}" data-period-month="${period.month}">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            Внести факт
                        </button>
                      </td>`;
                
                const diffCell = factVal !== null 
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
                document.getElementById('period-select').value = periodMonth;
                document.getElementById('period-id').value = periodId;
                
                // Вызываем событие изменения, чтобы загрузить плановое значение
                document.getElementById('metric-select').dispatchEvent(new Event('change'));
                
                // Показываем модальное окно
                modal.classList.add('active');
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
        
        // Подзаголовки (План, Факт, Отклонение)
        const planCell = document.createElement('td');
        planCell.className = 'sortable';
        planCell.dataset.sort = `metric${index + 1}-plan`;
        planCell.textContent = 'План';
        subHeaderRow.appendChild(planCell);
        
        const factCell = document.createElement('td');
        factCell.className = 'sortable';
        factCell.dataset.sort = `metric${index + 1}-fact`;
        factCell.textContent = 'Факт';
        subHeaderRow.appendChild(factCell);
        
        const diffCell = document.createElement('td');
        diffCell.className = 'sortable';
        diffCell.dataset.sort = `metric${index + 1}-diff`;
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
        
        // Используем годовое значение или запрашиваем его, если не найдено
        let totalPlan = yearlyPlanValue ? parseFloat(yearlyPlanValue.value) : 0;
        
        // Если годовое значение не найдено в метрике, делаем запрос через функцию
        if (totalPlan === 0) {
            totalPlan = await getYearlyPlanValue(metric.id, shopId);
            console.log(`Получено годовое значение через запрос API: ${totalPlan}`);
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
        return `
            <td>${formatNumber(totalPlan)} ${metric.unit}</td>
            <td>${formatNumber(totalFact)} ${metric.unit}</td>
            <td class="${diffClass}">${formattedDiff} ${metric.unit} (${formattedDiffPercentage}%)</td>
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
    
    // Удаляем старые обработчики, добавив класс handled
    document.querySelectorAll('.edit-plan-btn.handled, .edit-fact-btn.handled').forEach(button => {
        button.classList.remove('handled');
    });
    
    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll('.edit-plan-btn:not(.handled), .edit-fact-btn:not(.handled)').forEach(button => {
        // Помечаем кнопки, для которых добавлены обработчики
        button.classList.add('handled');
        
        button.addEventListener('click', async function(event) {
            // Предотвращаем всплытие события, чтобы оно не влияло на родительские элементы
            event.preventDefault();
            event.stopPropagation();
            
            console.log('Клик по кнопке редактирования');
            
            const metricId = this.dataset.metricId;
            const periodId = this.dataset.periodId;
            const valueType = this.dataset.type;
            const currentValue = this.dataset.value;
            
            console.log('Данные кнопки редактирования:', {
                metricId,
                periodId,
                valueType,
                currentValue
            });
            
            // Открываем модальное окно для редактирования значения
            const modal = document.getElementById('edit-value-modal');
            console.log('Модальное окно:', modal);
            
            if (modal) {
                // Получаем информацию о метрике
                try {
                    showLoading();
                    
                    // Получаем данные о метрике
                    const metric = await apiClient.get(`/finance/metrics/${metricId}`);
                    console.log('Данные о метрике:', metric);
                    
                    // Получаем данные о периоде
                    const period = await apiClient.get(`/finance/periods/${periodId}`);
                    console.log('Данные о периоде:', period);
                    
                    // Определяем название периода
                    let periodName = "Неизвестный период";
                    if (period) {
                        if (period.month && period.quarter) {
                            const monthNames = {
                                1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
                                7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
                            };
                            periodName = `${monthNames[period.month]} ${period.year}`;
                        } else if (period.quarter && !period.month) {
                            const quarterNames = {
                                1: 'I квартал', 2: 'II квартал', 3: 'III квартал', 4: 'IV квартал'
                            };
                            periodName = `${quarterNames[period.quarter]} ${period.year}`;
                        } else if (!period.quarter && !period.month) {
                            periodName = `Год ${period.year}`;
                        }
                    }
                    
                    // Заполняем форму
                    document.getElementById('edit-metric-id').value = metricId;
                    document.getElementById('edit-period-id').value = periodId;
                    document.getElementById('edit-value-type').value = valueType;
                    document.getElementById('edit-metric-name').textContent = `${metric.name} (${metric.unit})`;
                    document.getElementById('edit-period-name').textContent = periodName;
                    document.getElementById('edit-value').value = currentValue;
                    
                    // Показываем/скрываем опцию пересчета в зависимости от типа значения
                    const recalculateContainer = document.getElementById('recalculate-container');
                    if (valueType === 'fact' && period && period.month) {
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
} 
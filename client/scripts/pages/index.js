// Импортируем модуль авторизации
import authService from '../auth/auth.js';

// Класс для работы с API
class ApiClient {
    constructor(baseUrl = 'http://localhost:8000/api/v1') {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json'
        };
        
        // Добавляем токен авторизации, если он есть
        if (authService.isAuthenticated()) {
            this.headers['Authorization'] = authService.getAuthHeader();
        }
    }

    async get(endpoint) {
        try {
            console.log(`Выполняем GET запрос к ${this.baseUrl}${endpoint}`);
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: this.headers
            });
            
            // Если ошибка авторизации
            if (response.status === 401) {
                // Пробуем обновить токен
                try {
                    await authService.refreshToken();
                    // Обновляем заголовки с новым токеном
                    this.headers['Authorization'] = authService.getAuthHeader();
                    // Повторяем запрос
                    return this.get(endpoint);
                } catch (refreshError) {
                    // Если не удалось обновить токен, перенаправляем на страницу входа
                    console.error('Ошибка обновления токена:', refreshError);
                    window.location.href = '/client/pages/login.html';
                    throw refreshError;
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка GET запроса: ${error.message}`);
            // Не перенаправляем на страницу входа при общих ошибках сети
            if (error.message.includes('Failed to fetch')) {
                console.error('Ошибка сети - возможно, сервер недоступен');
                return []; // Возвращаем пустой массив вместо ошибки
            }
            throw error;
        }
    }

    // Добавляем метод для получения данных с параметрами
    async getWithParams(endpoint, params) {
        try {
            // Преобразуем объект параметров в строку запроса
            const queryParams = new URLSearchParams();
            for (const key in params) {
                queryParams.append(key, params[key]);
            }
            
            const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
            console.log(`Выполняем GET запрос с параметрами к ${url}`);
            
            const response = await fetch(url, {
                headers: this.headers
            });
            
            // Если ошибка авторизации
            if (response.status === 401) {
                // Пробуем обновить токен
                try {
                    await authService.refreshToken();
                    // Обновляем заголовки с новым токеном
                    this.headers['Authorization'] = authService.getAuthHeader();
                    // Повторяем запрос
                    return this.getWithParams(endpoint, params);
                } catch (refreshError) {
                    // Если не удалось обновить токен, перенаправляем на страницу входа
                    console.error('Ошибка обновления токена:', refreshError);
                    window.location.href = '/client/pages/login.html';
                    throw refreshError;
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Ошибка GET запроса с параметрами: ${error.message}`);
            // Не перенаправляем на страницу входа при общих ошибках сети
            if (error.message.includes('Failed to fetch')) {
                console.error('Ошибка сети - возможно, сервер недоступен');
                return []; // Возвращаем пустой массив вместо ошибки
            }
            throw error;
        }
    }
}

// Создаем экземпляр ApiClient
const apiClient = new ApiClient('http://localhost:8000/api/v1');

// Элементы DOM
const categoriesGrid = document.querySelector('.categories-grid');
const storesList = document.querySelector('.stores-list');
const categoriesCount = document.querySelector('.quick-stat-item:nth-child(1) .quick-stat-value');
const storesCount = document.querySelector('.quick-stat-item:nth-child(2) .quick-stat-value');

// Форматирование денежных значений
function formatCurrency(value) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2
    }).format(value);
}

// Текущий год для получения данных - используем 2025, так как в базе данных есть данные для этого года
const currentYear = 2025; // Фиксированный год для данных вместо new Date().getFullYear()

// Функция для обновления бюджетной карточки и быстрой статистики
async function updateBudgetOverview(allMetrics, periods) {
    try {
        // Получаем элементы DOM для обновления
        const budgetTitle = document.querySelector('.budget-title');
        const planValue = document.querySelector('.budget-tile-plan .tile-value');
        const factValue = document.querySelector('.budget-tile-fact .tile-value');
        const progressBar = document.querySelector('.budget-progress-bar');
        const budgetStatus = document.querySelector('.budget-status');
        const expensePercentage = document.querySelector('.quick-stat-item:nth-child(3) .quick-stat-value');
        
        // Получаем текущий месяц и используем фиксированный год
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // JavaScript месяцы с 0, нам нужно с 1
        // Используем фиксированный год вместо now.getFullYear()
        
        // Месяцы на русском
        const monthNames = {
            1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
            7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
        };
        
        // Обновляем заголовок бюджетной карточки
        if (budgetTitle) {
            budgetTitle.textContent = `Бюджет на ${monthNames[currentMonth]} ${currentYear}`;
        }
        
        // Вычисляем общие плановые и фактические значения для текущего месяца
        let totalPlan = 0;
        let totalFact = 0;
        
        // Проверяем, что у нас есть данные о периодах
        if (!periods || periods.length === 0) {
            console.warn('Нет данных о периодах');
            // Устанавливаем дефолтные значения для отображения
            if (planValue) planValue.textContent = formatCurrency(0);
            if (factValue) factValue.textContent = formatCurrency(0);
            if (progressBar) progressBar.style.width = '0%';
            if (budgetStatus) {
                budgetStatus.className = 'budget-status';
                budgetStatus.innerHTML = `
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                    </svg>
                    Нет данных
                `;
            }
            if (expensePercentage) expensePercentage.textContent = '0%';
            return;
        }
        
        // Фильтруем периоды для текущего года и месяца
        const currentYearPeriods = periods.filter(p => p.year === currentYear);
        // Находим период текущего месяца
        const currentMonthPeriod = currentYearPeriods.find(p => p.month === currentMonth);
        
        // Проверяем, что у нас есть данные о текущем месяце
        if (!currentMonthPeriod) {
            console.warn(`Нет данных о периоде для ${monthNames[currentMonth]} ${currentYear}`);
            // Устанавливаем дефолтные значения для отображения
            if (planValue) planValue.textContent = formatCurrency(0);
            if (factValue) factValue.textContent = formatCurrency(0);
            if (progressBar) progressBar.style.width = '0%';
            if (budgetStatus) {
                budgetStatus.className = 'budget-status';
                budgetStatus.innerHTML = `
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                    </svg>
                    Нет данных за текущий месяц
                `;
            }
            if (expensePercentage) expensePercentage.textContent = '0%';
            return;
        }
        
        // Проверяем, что у нас есть данные о метриках
        if (!allMetrics || !Array.isArray(allMetrics) || allMetrics.length === 0) {
            console.warn('Нет данных о метриках');
            if (planValue) planValue.textContent = formatCurrency(0);
            if (factValue) factValue.textContent = formatCurrency(0);
            if (progressBar) progressBar.style.width = '0%';
            if (budgetStatus) {
                budgetStatus.className = 'budget-status';
                budgetStatus.innerHTML = `
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                    </svg>
                    Нет данных о метриках
                `;
            }
            if (expensePercentage) expensePercentage.textContent = '0%';
            return;
        }
        
        // Если у нас есть данные о метриках и текущем периоде, вычисляем значения
        for (const metricData of allMetrics) {
            // Проверяем, что у метрики есть массив metrics
            if (!metricData.metrics || !Array.isArray(metricData.metrics)) {
                console.warn('Неверный формат данных метрики:', metricData);
                continue;
            }
            
            for (const metric of metricData.metrics) {
                // Проверяем, что у метрики есть массивы planValues и actualValues
                if (!metric.planValues || !Array.isArray(metric.planValues) || 
                    !metric.actualValues || !Array.isArray(metric.actualValues)) {
                    console.warn('Неверный формат данных для метрики:', metric);
                    continue;
                }
                
                // Находим плановое значение для текущего месяца
                const planValueData = metric.planValues.find(plan => plan.period_id === currentMonthPeriod.id);
                if (planValueData) {
                    totalPlan += parseFloat(planValueData.value);
                }
                
                // Находим фактическое значение для текущего месяца
                const factValueData = metric.actualValues.find(actual => actual.period_id === currentMonthPeriod.id);
                if (factValueData) {
                    totalFact += parseFloat(factValueData.value);
                }
            }
        }
        
        // Обновляем значения в бюджетной карточке
        if (planValue) {
            planValue.textContent = formatCurrency(totalPlan);
        }
        
        if (factValue) {
            factValue.textContent = formatCurrency(totalFact);
        }
        
        // Вычисляем процент выполнения и разницу
        const percentage = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;
        const difference = totalFact - totalPlan;
        const isOverage = totalFact > totalPlan;
        
        // Обновляем прогресс-бар
        if (progressBar) {
            progressBar.style.width = `${Math.min(percentage, 200)}%`;
        }
        
        // Обновляем статус бюджета
        if (budgetStatus) {
            budgetStatus.className = `budget-status ${isOverage ? 'budget-status--overage' : ''}`;
            budgetStatus.innerHTML = `
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="${isOverage ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'}"></path>
                </svg>
                ${isOverage ? `Превышение на ${percentage - 100}% (${formatCurrency(difference)})` : 
                             `Экономия на ${100 - percentage}% (${formatCurrency(-difference)})`}
            `;
        }
        
        // Обновляем процент расходов в быстрой статистике
        if (expensePercentage) {
            expensePercentage.textContent = `${percentage}%`;
        }
    } catch (error) {
        console.error('Ошибка при обновлении бюджетного обзора:', error);
    }
}

// Флаг для отслеживания загрузки данных
let isDataLoading = false;
let dataLoaded = false;

// Функция для инициализации страницы
async function initPage() {
    // Проверяем аутентификацию пользователя
    if (!authService.isAuthenticated()) {
        // Если пользователь не авторизован, перенаправляем на страницу входа
        window.location.href = './pages/login.html';
        return;
    }
    
    try {
        // Загружаем данные пользователя
        const user = await authService.getCurrentUser();
        if (!user) {
            console.error('Не удалось загрузить данные пользователя');
            return;
        }
        
        // Обновляем информацию о пользователе в интерфейсе
        updateUserInfo(user);
        
        // Загружаем категории и магазины только если они еще не загружены
        if (!dataLoaded) {
            await loadCategoriesAndStores();
        }
        
        console.log('Инициализация страницы успешно завершена');
    } catch (error) {
        console.error('Ошибка при инициализации страницы:', error);
        // Если произошла ошибка аутентификации, перенаправляем на страницу входа
        if (error.message.includes('авторизован') || error.message.includes('токен')) {
            window.location.href = './pages/login.html';
        }
    }
}

// Функция для обновления информации о пользователе
function updateUserInfo(user) {
    const userAvatarInner = document.querySelector('.user-avatar .avatar-inner');
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    
    // Если элементы найдены, обновляем их
    if (userAvatarInner) {
        // Если у пользователя есть имя и фамилия, используем инициалы
        if (user.username) {
            const initials = user.username.substring(0, 2).toUpperCase();
            userAvatarInner.textContent = initials;
        }
    }
    
    if (userName) {
        userName.textContent = user.username || 'Пользователь';
    }
    
    if (userRole) {
        userRole.textContent = user.role?.name || 'Пользователь';
    }
    
    // Показываем или скрываем ссылку на админпанель в зависимости от роли
    setupAdminLink(user);
}

// Функция для настройки видимости ссылки на админпанель
function setupAdminLink(user) {
    const adminLink = document.querySelector('.admin-link');
    if (!adminLink) return;
    
    // Показываем ссылку на админпанель только для админов и менеджеров
        if (user.role && (user.role.name === 'admin' || user.role.name === 'manager')) {
        console.log('Отображаем ссылку на админпанель для роли:', user.role.name);
            adminLink.style.display = 'block';
        } else {
        console.log('Скрываем ссылку на админпанель');
            adminLink.style.display = 'none';
    }
}

// Функция для загрузки категорий и магазинов
async function loadCategoriesAndStores() {
    // Проверяем, не выполняется ли уже загрузка
    if (isDataLoading) {
        console.log('Загрузка данных уже выполняется');
        return;
    }
    
    // Устанавливаем флаг, что началась загрузка
    isDataLoading = true;
    
    try {
        console.log('Начинаем загрузку категорий и магазинов');
        
        // Получаем периоды для бюджетного обзора
        const periods = await apiClient.get('/finance/periods');
        
        // Загружаем метрики с категориями
        const allMetrics = await apiClient.get('/finance/metrics');
        
        // Обновляем бюджетный обзор
        await updateBudgetOverview(allMetrics, periods);
        
        // Загружаем категории
        await loadCategories();
        
        // Помечаем, что данные загружены
        dataLoaded = true;
        console.log('Данные успешно загружены');
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
    } finally {
        // Снимаем флаг загрузки
        isDataLoading = false;
    }
}

/**
 * Загрузка категорий с сервера
 */
async function loadCategories() {
    try {
        console.log('Загрузка категорий...');
        
        // Показываем индикатор загрузки
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loadingOverlay);
        
        // Очищаем существующие карточки категорий
        if (categoriesGrid) {
            console.log('Очистка существующих категорий');
            categoriesGrid.innerHTML = '';
        } else {
            console.error('Элемент categoriesGrid не найден');
            document.body.removeChild(loadingOverlay);
            return;
        }
        
        // Получаем категории с сервера
        const categories = await apiClient.get('/finance/categories/with-images');
        
        // Обновляем счетчик категорий
        if (categoriesCount) {
            categoriesCount.textContent = categories.length;
        }
        
        // Если категорий нет
        if (categories.length === 0) {
            categoriesGrid.innerHTML = '<div class="empty-state">Категории не найдены</div>';
            document.body.removeChild(loadingOverlay); // Убираем индикатор загрузки
            return;
        }

        // Получаем все периоды
        let periods = [];
        try {
            // Получаем все периоды без фильтрации по году
            periods = await apiClient.get('/finance/periods');
            console.log('Получены периоды:', periods);
        } catch (error) {
            console.error('Ошибка при загрузке периодов:', error);
            // Если не удалось загрузить периоды, показываем сообщение об ошибке
            categoriesGrid.innerHTML = `
                <div class="error-state">
                    Не удалось загрузить периоды. Ошибка: ${error.message}
                </div>
            `;
            document.body.removeChild(loadingOverlay); // Убираем индикатор загрузки
            return;
        }
        
        // Получаем магазины (требуется для запросов метрик)
        let shops = [];
        try {
            shops = await apiClient.get('/finance/shops');
        } catch (error) {
            console.error('Ошибка при загрузке магазинов:', error);
            document.body.removeChild(loadingOverlay); // Убираем индикатор загрузки
            return;
        }
        
        // Обновляем счетчик магазинов
        if (storesCount) {
            storesCount.textContent = shops.length;
        }
        
        // Используем первый магазин по умолчанию или пустой ID, если магазинов нет
        const defaultShopId = shops.length > 0 ? shops[0].id : '';
        
        // Годовой и месячные периоды
        const yearPeriod = periods.find(p => p.year === currentYear && p.quarter === null && p.month === null);
        const monthPeriods = periods.filter(p => p.year === currentYear && p.month !== null);
        
        // Получаем все метрики
        let allMetrics = [];
        for (const category of categories) {
            if (!category.status) continue; // Пропускаем неактивные категории

            try {
                // Получаем метрики для категории
                const metrics = await apiClient.getWithParams('/finance/metrics', { 
                    category_id: category.id 
                });
                
                // Если есть метрики, добавляем их в общий список с id категории
                if (metrics && metrics.length > 0) {
                    // Для каждой метрики получаем плановые и фактические значения
                    for (const metric of metrics) {
                        try {
                            // Получаем плановые значения для метрики с учетом магазина
                            let planValues = [];
                            if (defaultShopId) {
                                const planParams = {
                                    metric_id: metric.id,
                                    shop_id: defaultShopId
                                };
                                const planData = await apiClient.getWithParams('/finance/plan-values', planParams);
                                planValues = planData || [];
                            }
                            metric.planValues = planValues;
                        } catch (error) {
                            console.warn(`Не удалось получить плановые значения для метрики ${metric.id}:`, error);
                            metric.planValues = [];
                        }
                        
                        try {
                            // Получаем фактические значения для метрики с учетом магазина
                            let actualValues = [];
                            if (defaultShopId) {
                                const actualParams = {
                                    metric_id: metric.id,
                                    shop_id: defaultShopId
                                };
                                const actualData = await apiClient.getWithParams('/finance/actual-values', actualParams);
                                actualValues = actualData || [];
                            }
                            metric.actualValues = actualValues;
                        } catch (error) {
                            console.warn(`Не удалось получить фактические значения для метрики ${metric.id}:`, error);
                            metric.actualValues = [];
                        }
                    }
                    
                    // Добавляем метрики с id категории
                    allMetrics.push({
                        categoryId: category.id,
                        metrics: metrics
                    });
                }
            } catch (error) {
                console.error(`Ошибка при загрузке метрик для категории ${category.id}:`, error);
            }
        }
        
        // Обновляем бюджетную карточку и быструю статистику
        await updateBudgetOverview(allMetrics, periods);
        
        // Отображаем категории
        categories.forEach(category => {
            if (!category.status) return; // Пропускаем неактивные категории
            
            // Создаем SVG-изображение или заглушку
            let svgContent = '';
            if (category.image && category.image.svg_data) {
                svgContent = `
                    <svg class="category-icon__svg" viewBox="0 0 24 24">
                        <path d="${category.image.svg_data}"></path>
                    </svg>
                `;
            } else {
                // Заглушка, если нет изображения
                svgContent = `
                    <svg class="category-icon__svg" viewBox="0 0 24 24">
                        <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path>
                    </svg>
                `;
            }
            
            // Находим метрики для текущей категории
            const categoryMetricsData = allMetrics.find(m => m.categoryId === category.id);
            let planAmount = 0;
            let factAmount = 0;
            
            if (categoryMetricsData && categoryMetricsData.metrics.length > 0) {
                // Суммируем все плановые и фактические значения метрик категории
                for (const metric of categoryMetricsData.metrics) {
                    // Годовой период (без квартала и месяца)
                    if (yearPeriod) {
                        // Плановое значение на год
                        const yearPlanValue = metric.planValues.find(plan => plan.period_id === yearPeriod.id);
                        if (yearPlanValue) {
                            planAmount += parseFloat(yearPlanValue.value);
                        }
                    }
                    
                    // Суммируем фактические значения по всем месяцам
                    for (const period of monthPeriods) {
                        const factValue = metric.actualValues.find(actual => actual.period_id === period.id);
                        if (factValue) {
                            factAmount += parseFloat(factValue.value);
                        }
                    }
                }
            } else {
                // Если нет метрик, то показываем нули
                planAmount = 0;
                factAmount = 0;
            }
            
            // Вычисляем процент выполнения плана и разницу
            const percentage = planAmount > 0 ? Math.round((factAmount / planAmount) * 100) : 0;
            const difference = factAmount - planAmount;
            const isOverage = factAmount > planAmount;
            
            // Создаем карточку категории
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            categoryCard.dataset.category = category.id;
            
            categoryCard.innerHTML = `
                <div style="display: flex; justify-content: space-between">
                    <div class="category-icon">
                        ${svgContent}
                    </div>
                    <div style="text-align: end">
                        <h3 class="category-title">${category.name}</h3>
                        <p class="category-desc">${category.description || 'Нет описания'}</p>
                    </div>
                </div>

                <div class="budget-tiles category-tiles">
                    <div class="budget-tile budget-tile-plan">
                        <div class="tile-label">План</div>
                        <div class="tile-value">${formatCurrency(planAmount)}</div>
                    </div>
                    <div class="budget-tile budget-tile-fact">
                        <div class="tile-label">Факт</div>
                        <div class="tile-value">${formatCurrency(factAmount)}</div>
                    </div>
                </div>

                <div class="category-info">
                    <div class="category-progress">
                        <div class="category-progress-bar" style="width: ${Math.min(percentage, 200)}%;"></div>
                    </div>
                    <div class="category-status ${isOverage ? 'category-status--overage' : ''}">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="${isOverage ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'}"></path>
                        </svg>
                        ${isOverage ? `Превышение: ${percentage - 100}% (${formatCurrency(difference)})` : 
                                     `Экономия: ${100 - percentage}% (${formatCurrency(-difference)})`}
                    </div>
                    <div class="category-action">Выбрать</div>
                </div>
            `;
            
            categoriesGrid.appendChild(categoryCard);

            // Добавляем обработчик клика для выбора категории
            categoryCard.addEventListener('click', () => {
                // Убираем активный класс у всех категорий
                document.querySelectorAll('.category-card').forEach(card => {
                    card.classList.remove('active');
                });
                
                // Делаем выбранную категорию активной
                categoryCard.classList.add('active');
                
                // Устанавливаем название категории в заголовке секции магазинов
                const currentCategorySpan = document.getElementById('current-category');
                if (currentCategorySpan) {
                    currentCategorySpan.textContent = category.name;
                }
                
                // Отображаем секцию с магазинами и активируем второй шаг инструкции
                const storesSection = document.getElementById('stores-section');
                if (storesSection) {
                    storesSection.classList.add('active');
                    
                    // Активируем шаг 2 в инструкции
                    document.querySelector('[data-step="1"]').classList.add('completed');
                    document.querySelector('[data-step="2"]').classList.add('active');
                    
                    // Добавляем небольшую задержку перед прокруткой, чтобы секция успела отобразиться
                    setTimeout(() => {
                    // Прокручиваем к секции магазинов
                    storesSection.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                    });
                    }, 100);
                    
                    // Загружаем магазины для выбранной категории
                    loadStores(category.id);
                }
            });
        });
        
        // Убираем индикатор загрузки
        document.body.removeChild(loadingOverlay);
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
        categoriesGrid.innerHTML = `
            <div class="error-state">
                Не удалось загрузить категории. Ошибка: ${error.message}
            </div>
        `;
        
        // Убираем индикатор загрузки в случае ошибки
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            document.body.removeChild(loadingOverlay);
        }
    }
}

/**
 * Загрузка магазинов с сервера
 */
async function loadStores(categoryId = null) {
    try {
        // Проверяем наличие контейнера для магазинов на странице
        const storesGrid = document.querySelector('.stores-grid');
        if (!storesGrid) return;
        
        // Очищаем существующие магазины
        storesGrid.innerHTML = '';
        
        // Получаем магазины с сервера
        const stores = await apiClient.get('/finance/shops');
        
        // Обновляем счетчик магазинов
        if (storesCount) {
            storesCount.textContent = stores.length;
        }
        
        // Если магазинов нет
        if (stores.length === 0) {
            storesGrid.innerHTML = '<div class="empty-state">Магазины не найдены</div>';
            return;
        }
        
        // Получаем все периоды
        let periods = [];
        try {
            // Получаем все периоды без фильтрации по году
            periods = await apiClient.get('/finance/periods');
        } catch (error) {
            console.error('Ошибка при загрузке периодов:', error);
            // Если не удалось загрузить периоды, показываем сообщение об ошибке
            storesGrid.innerHTML = `
                <div class="error-state">
                    Не удалось загрузить периоды. Ошибка: ${error.message}
                </div>
            `;
            return;
        }
        
        // Отображаем магазины
        for (const store of stores) {
            if (!store.status) continue; // Пропускаем неактивные магазины
            
            // Получаем метрики по категории, если указан ID категории
            let storeAmount = 0;
            
            if (categoryId) {
                try {
                    // Получаем метрики для выбранной категории
                    const metrics = await apiClient.getWithParams('/finance/metrics', { 
                        category_id: categoryId 
                    });
                    
                    if (metrics && metrics.length > 0) {
                        // Получаем все фактические значения для магазина
                        try {
                            // Прямой запрос фактических значений для магазина
                            const actualValues = await apiClient.getWithParams('/finance/actual-values', {
                                shop_id: store.id
                            });
                            
                            // Фильтруем значения только для метрик выбранной категории
                            const metricIds = metrics.map(m => m.id);
                            const filteredValues = actualValues.filter(v => metricIds.includes(v.metric_id));
                            
                            // Суммируем все фактические значения
                            for (const value of filteredValues) {
                                storeAmount += parseFloat(value.value);
                            }
                        } catch (error) {
                            console.error(`Ошибка при загрузке фактических значений для магазина ${store.id}:`, error);
                        }
                    }
                } catch (error) {
                    console.error(`Ошибка при загрузке метрик для категории ${categoryId}:`, error);
                }
            } else {
                // Если категория не выбрана, показываем суммарные значения по всем метрикам для этого магазина
                try {
                    // Получаем все фактические значения для магазина
                    const actualValues = await apiClient.getWithParams('/finance/actual-values', {
                        shop_id: store.id
                    });
                    
                    // Суммируем все фактические значения
                    for (const value of actualValues) {
                        storeAmount += parseFloat(value.value);
                    }
                } catch (error) {
                    console.error(`Ошибка при загрузке фактических значений для магазина ${store.id}:`, error);
                }
            }
            
            // Создаем элемент карточки магазина с описанием
            const storeCard = document.createElement('div');
            storeCard.className = 'store-card';
            storeCard.dataset.store = store.id;
            
            // Получаем описание магазина или используем заглушку
            const description = store.description || 'Описание магазина отсутствует';

            storeCard.innerHTML = `
                <div class="store-card-header">
                <div class="store-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor"
                            class="bi bi-shop" viewBox="0 0 16 16">
                            <path d="M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.371 2.371 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976l2.61-3.045zm1.78 4.275a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 1 0 2.75 0V5.37a.5.5 0 0 0-.12-.325L12.27 2H3.73L1.12 5.045A.5.5 0 0 0 1 5.37v.255a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0M1.5 8.5A.5.5 0 0 1 2 9v6h1v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h6V9a.5.5 0 0 1 1 0v6h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1V9a.5.5 0 0 1 .5-.5M4 15h3v-5H4zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zm3 0h-2v3h2z"/>
                    </svg>
                </div>
                <div class="store-name">${store.name}</div>
                    <div class="store-amount">${formatCurrency(storeAmount)}</div>
                </div>
                <div class="store-card-body">
                    <div class="store-address">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>${store.address || 'Адрес не указан'}</span>
                    </div>
                    <div class="store-description">${description}</div>
                </div>
                <div class="store-card-footer">
                    <button class="store-view-report">
                        Просмотреть отчет
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            `;
            
            storesGrid.appendChild(storeCard);
            
            // Добавляем обработчик клика для всей карточки магазина
            storeCard.addEventListener('click', function() {
                // Убираем активный класс у всех магазинов
                document.querySelectorAll('.store-card').forEach(card => {
                    card.classList.remove('active');
                });
                
                // Делаем выбранный магазин активным
                this.classList.add('active');
                
                // Активируем шаг 3 в инструкции
                document.querySelector('[data-step="2"]').classList.add('completed');
                document.querySelector('[data-step="3"]').classList.add('active');
                
                // Добавляем класс loading, чтобы показать индикатор загрузки
                this.classList.add('loading');
                
                // Здесь можно добавить логику для перехода к отчету
                // Для демонстрации перенаправляем на страницу отчета с небольшой задержкой
                setTimeout(() => {
                    const selectedCategory = document.querySelector('.category-card.active').dataset.category;
                    console.log(`Переход к отчету: категория ${selectedCategory}, магазин ${store.id}`);
                    // Раскомментируйте следующую строку для реального перехода:
                    window.location.href = `./pages/page.html?category=${selectedCategory}&store=${store.id}`;
                }, 800);
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке магазинов:', error);
        const storesGrid = document.querySelector('.stores-grid');
        if (storesGrid) {
            storesGrid.innerHTML = `
                <div class="error-state">
                    Не удалось загрузить магазины. Ошибка: ${error.message}
                </div>
            `;
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик клика по кнопке сброса выбора
    const resetButton = document.getElementById('resetSelection');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Убираем активный класс у всех категорий
            document.querySelectorAll('.category-card').forEach(card => {
                card.classList.remove('active');
            });
            
            // Скрываем секцию магазинов
            const storesSection = document.getElementById('stores-section');
            if (storesSection) {
                storesSection.classList.remove('active');
                // Добавляем задержку перед удалением содержимого, чтобы анимация успела проиграть
                setTimeout(() => {
                    const storesGrid = document.querySelector('.stores-grid');
                    if (storesGrid) {
                        storesGrid.innerHTML = '';
                    }
                }, 300);
            }
            
            // Сбрасываем шаги в инструкции
            document.querySelector('[data-step="1"]').classList.remove('completed');
            document.querySelector('[data-step="2"]').classList.remove('active');
            document.querySelector('[data-step="2"]').classList.remove('completed');
            document.querySelector('[data-step="3"]').classList.remove('active');
            
            // Прокручиваем к секции категорий
            setTimeout(() => {
            document.querySelector('.categories-section').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
            });
            }, 100);
        });
    }
    
    // Обработчик закрытия инструкции
    const closeInstructionButton = document.getElementById('closeInstruction');
    if (closeInstructionButton) {
        closeInstructionButton.addEventListener('click', () => {
            const instruction = document.getElementById('instruction');
            if (instruction) {
                instruction.style.display = 'none';
            }
        });
    }
    
    // Обновляем дату
    const dateDisplay = document.querySelector('.date-display');
    if (dateDisplay) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = now.toLocaleDateString('ru-RU', options);
    }
    
    // Функция для скрытия инструкции после того, как пользователь выбрал категорию
    function hideInstructionAfterSelection() {
        document.getElementById('instruction').style.display = 'none';
    }
    
    // Обработчик для кнопки выхода из системы
    const logoutButton = document.querySelector('.user-dropdown-item:last-child');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                await authService.logout();
                window.location.href = './pages/login.html';
            } catch (error) {
                console.error('Ошибка при выходе из системы:', error);
                // Даже если произошла ошибка, все равно перенаправляем на страницу входа
                window.location.href = './pages/login.html';
            }
        });
    }
    
    // Инициализируем работу с пользовательским выпадающим меню
    const userInfo = document.querySelector('.user-info');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userInfo && userDropdown) {
        userInfo.addEventListener('click', function(e) {
            if (e.target.closest('.user-avatar') || e.target.closest('.user-details')) {
                userDropdown.classList.toggle('active');
            }
        });
        
        // Закрытие выпадающего меню при клике вне его
        document.addEventListener('click', function(e) {
            if (!userInfo.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }
    
    // Инициализация страницы
    initPage();
});
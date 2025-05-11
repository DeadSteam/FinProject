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
}

// Создаем экземпляр ApiClient
const apiClient = new ApiClient('http://localhost:8000/api/v1');

// Элементы DOM
const categoriesGrid = document.querySelector('.categories-grid');
const categoriesCount = document.querySelector('.quick-stat-item:nth-child(1) .quick-stat-value');
const storesCount = document.querySelector('.quick-stat-item:nth-child(2) .quick-stat-value');
const expensePercentage = document.querySelector('.quick-stat-item:nth-child(3) .quick-stat-value');
const planValue = document.querySelector('.budget-tile-plan .tile-value');
const factValue = document.querySelector('.budget-tile-fact .tile-value');
const progressBar = document.querySelector('.budget-progress-bar');
const budgetStatus = document.querySelector('.budget-status');
const storesSection = document.getElementById('stores-section');
const storesGrid = document.querySelector('.stores-grid');
const currentCategoryElement = document.getElementById('current-category');

// Глобальная переменная для хранения данных дашборда
let dashboardData = null;

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

        // Загружаем данные дашборда
        await loadDashboardData();

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

// Функция для загрузки данных дашборда из нового API-эндпоинта
async function loadDashboardData() {
    try {
        // Загружаем данные из нового API-эндпоинта
        dashboardData = await apiClient.get('/finance/analytics/dashboard/aggregate');
        console.log('Загружены данные дашборда:', dashboardData);

        // Обновляем бюджетную информацию
        updateBudgetInfo(dashboardData);

        // Загружаем категории и магазины
        loadCategories(dashboardData);
    } catch (error) {
        console.error('Ошибка при загрузке данных дашборда:', error);
    }
}

// Функция для обновления бюджетной информации
function updateBudgetInfo(data) {
    // Обновляем счетчики
    if (categoriesCount) categoriesCount.textContent = data.dashboard_metrics.count_category;
    if (storesCount) storesCount.textContent = data.dashboard_metrics.count_shops;
    if (expensePercentage) expensePercentage.textContent = `${data.dashboard_metrics.all_yearly_procent}%`;

    // Обновляем бюджетные значения
    const monthPlan = data.month_values.month_plan;
    const monthActual = data.month_values.month_actual;
    const monthPercent = data.month_values.month_procent;

    if (planValue) planValue.textContent = formatCurrency(monthPlan);
    if (factValue) factValue.textContent = formatCurrency(monthActual);

    // Обновляем прогресс-бар
    if (progressBar) {
        progressBar.style.width = `${Math.min(100, monthPercent)}%`;

        // Цвет прогресс-бара зависит от процента выполнения
        if (monthPercent < 80) {
            progressBar.style.backgroundColor = 'var(--warning)'; // Отстает от плана
        } else if (monthPercent <= 105) {
            progressBar.style.backgroundColor = 'var(--success)'; // В рамках плана
        } else {
            progressBar.style.backgroundColor = 'var(--danger)'; // Превышает план
        }
    }

    // Обновляем статус бюджета
    if (budgetStatus) {
        // Вычисляем разницу в деньгах
        const difference = monthActual - monthPlan;
        const isOverage = monthActual > monthPlan;

        budgetStatus.className = `budget-status ${isOverage ? 'budget-status--overage' : ''}`;
        budgetStatus.innerHTML = `
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="${isOverage ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'}"></path>
            </svg>
            ${isOverage ?
            `Превышение: ${Math.round(monthPercent - 100)}% (${formatCurrency(difference)})` :
            `Экономия: ${Math.round(100 - monthPercent)}% (${formatCurrency(-difference)})`}
        `;
    }
}

// Функция для загрузки категорий
function loadCategories(data) {
    if (!categoriesGrid) return;

    categoriesGrid.innerHTML = '';

    const categories = data.categories;

    // Если нет категорий
    if (!categories || categories.length === 0) {
        categoriesGrid.innerHTML = '<div class="empty-state">Нет доступных категорий расходов</div>';
        return;
    }

    // Создаем карточки для категорий
    categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.dataset.category = category.id;

        const progressPercent = category.yearly_procent;

        categoryCard.innerHTML = `
                <div style="display: flex; justify-content: space-between">
                    <div class="category-icon">
                    <svg class="category-icon__svg" viewBox="0 0 24 24">
                        <path d="${category.image}"></path>
                    </svg>
                    </div>
                    <div style="text-align: end">
                        <h3 class="category-title">${category.name}</h3>
                        <p class="category-desc">${category.description || 'Нет описания'}</p>
                    </div>
                </div>

                <div class="budget-tiles category-tiles">
                    <div class="budget-tile budget-tile-plan">
                        <div class="tile-label">План</div>
                    <div class="tile-value">${formatCurrency(category.yearly_plan)}</div>
                    </div>
                    <div class="budget-tile budget-tile-fact">
                        <div class="tile-label">Факт</div>
                    <div class="tile-value">${formatCurrency(category.yearly_actual)}</div>
                    </div>
                </div>

                <div class="category-info">
                    <div class="category-progress">
                    <div class="category-progress-bar" style="width: ${Math.min(progressPercent, 200)}%;"></div>
                    </div>
                <div class="category-status ${progressPercent > 100 ? 'category-status--overage' : ''}">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="${progressPercent > 100 ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'}"></path>
                        </svg>
                    ${progressPercent > 100 ?
            `Превышение: ${Math.round(progressPercent - 100)}% (${formatCurrency(category.yearly_actual - category.yearly_plan)})` :
            `Экономия: ${Math.round(100 - progressPercent)}% (${formatCurrency(category.yearly_plan - category.yearly_actual)})`}
                    </div>
                    <div class="category-action">Выбрать</div>
                </div>
            `;

        // Добавляем обработчик клика
        categoryCard.addEventListener('click', function () {
            // Убираем выделение со всех карточек
            document.querySelectorAll('.category-card').forEach(card => {
                card.classList.remove('active');
            });

            // Выделяем выбранную карточку
            categoryCard.classList.add('active');

            // Загружаем список магазинов для выбранной категории
            loadStores(category.id);

            // Скрываем инструкцию после выбора категории
            hideInstructionAfterSelection();

            // Показываем второй шаг инструкции
            showInstructionStep(2);

            // Отображаем секцию с магазинами и активируем второй шаг инструкции
            const storesSection = document.getElementById('stores-section');
            if (storesSection) {
                storesSection.classList.add('active');

                // Активируем шаг 2 в инструкции
                document.querySelector('[data-step="1"]').classList.add('completed');
                document.querySelector('[data-step="2"]').classList.add('active');

                // Добавляем небольшую задержку перед прокруткой
                setTimeout(() => {
                    // Прокручиваем к секции магазинов
                    storesSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100);
            }
        });

        categoriesGrid.appendChild(categoryCard);
    });
}

// Функция для загрузки магазинов
function loadStores(categoryId) {
    if (!storesGrid) return;

    storesGrid.innerHTML = '';

    // Получаем данные выбранной категории из загруженных данных
    const categoryData = dashboardData.categories.find(category => category.id === categoryId);
    if (!categoryData) {
        console.error(`Категория с ID ${categoryId} не найдена в данных`);
        return;
    }

    // Устанавливаем имя текущей категории
    currentCategoryElement.textContent = categoryData.name;

    // Показываем секцию магазинов
    storesSection.classList.add('active');

    const stores = dashboardData.shops;

    // Если нет магазинов
    if (!stores || stores.length === 0) {
        storesGrid.innerHTML = '<div class="empty-state">Нет доступных магазинов</div>';
        return;
    }

    // Создаем карточки для магазинов
    stores.forEach(store => {
        const storeCard = document.createElement('div');
        storeCard.className = 'store-card';
        storeCard.dataset.store = store.id;

        storeCard.innerHTML = `
                <div class="store-card-header">
                <div class="store-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor"
                            class="bi bi-shop" viewBox="0 0 16 16">
                            <path d="M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.371 2.371 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976l2.61-3.045zm1.78 4.275a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 1 0 2.75 0V5.37a.5.5 0 0 0-.12-.325L12.27 2H3.73L1.12 5.045A.5.5 0 0 0 1 5.37v.255a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0M1.5 8.5A.5.5 0 0 1 2 9v6h1v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h6V9a.5.5 0 0 1 1 0v6h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1V9a.5.5 0 0 1 .5-.5M4 15h3v-5H4zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zm3 0h-2v3h2z"/>
                    </svg>
                </div>
                <div class="store-name">${store.name}</div>
                <div class="store-amount">${formatCurrency(store.yearly_actual)}</div>
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
                <div class="store-description">${store.description || 'Описание не указано'}</div>
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

        // Добавляем обработчик клика на кнопку "Просмотреть отчет"
        storeCard.querySelector('.store-view-report').addEventListener('click', function () {
            // Получаем текущий год
            const currentYear = new Date().getFullYear();
            
            // Перенаправляем на страницу с детальной информацией
            window.location.href = `./pages/finance-details.html?category=${categoryId}&store=${store.id}&year=${currentYear}`;

            // Показываем третий шаг инструкции
            showInstructionStep(3);
        });

        storesGrid.appendChild(storeCard);
    });
}

// Показ и скрытие индикатора загрузки
function showLoading() {
    let loader = document.querySelector('.loading-overlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.querySelector('.loading-overlay');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Функция для отображения определенного шага инструкции
function showInstructionStep(step) {
    const instructionSteps = document.querySelectorAll('.instruction-step');
    instructionSteps.forEach(stepElem => {
        if (parseInt(stepElem.dataset.step) === step) {
            stepElem.classList.add('active');
        } else {
            stepElem.classList.remove('active');
        }
    });
}

// Скрытие инструкции после выбора
function hideInstructionAfterSelection() {
    const instruction = document.getElementById('instruction');
    if (instruction) {
        instruction.classList.add('minimized');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
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
        const options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        dateDisplay.textContent = now.toLocaleDateString('ru-RU', options);
    }

    // Функция для скрытия инструкции после того, как пользователь выбрал категорию
    function hideInstructionAfterSelection() {
        document.getElementById('instruction').style.display = 'none';
    }

    // Обработчик для кнопки выхода из системы
    const logoutButton = document.querySelector('.user-dropdown-item:last-child');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function (e) {
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
        userInfo.addEventListener('click', function (e) {
            if (e.target.closest('.user-avatar') || e.target.closest('.user-details')) {
                userDropdown.classList.toggle('active');
            }
        });

        // Закрытие выпадающего меню при клике вне его
        document.addEventListener('click', function (e) {
            if (!userInfo.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    // Инициализация страницы
    initPage();
});
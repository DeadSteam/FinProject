/**
 * Модуль для работы с графиками финансовой аналитики
 */

// Вспомогательная функция для форматирования чисел
function formatNumber(number) {
    // Сохраняем знак числа
    const isNegative = number < 0;
    // Форматируем абсолютное значение числа
    const formattedAbsNumber = new Intl.NumberFormat('ru-RU').format(Math.abs(number));
    // Возвращаем число со знаком, если оно отрицательное
    return isNegative ? `-${formattedAbsNumber}` : formattedAbsNumber;
}

/**
 * Создает кнопки переключения для графиков на основе доступных метрик
 * @param {Array} metrics - Массив метрик
 */
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

/**
 * Настраивает график и обработчики для переключения между метриками и видами графика
 * @param {Array} metrics - Массив метрик
 * @param {Array} periods - Массив периодов
 */
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
            
            // Обновляем график, передаем periods
            renderChart(activeMetric, activeView, periods);
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
            
            // Обновляем график, передаем periods
            renderChart(activeMetric, activeView, periods);
        });
    });
    
    // Инициализируем график с первой метрикой и видом по умолчанию
    if (activeMetric) {
        renderChart(activeMetric, activeView, periods);
    }
    
    // Вызываем функцию фиксации размеров графика
    fixChartContainerSize();
}

/**
 * Рендерит график для выбранной метрики и вида
 * @param {Object} metric - Выбранная метрика
 * @param {string} view - Вид графика (quarters/months)
 * @param {Array} periods - Массив периодов
 */
function renderChart(metric, view, periods) {
    const chartContainer = document.getElementById('hoursChart');
    const chartTitle = document.querySelector('.chart-title');
    
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
    
    // Рисуем график
    renderBarChart(chartContainer, chartData, metric);
}

/**
 * Рендерит столбчатый график
 * @param {HTMLElement} container - Контейнер для графика
 * @param {Array} data - Данные для графика
 * @param {Object} currentMetric - Текущая метрика
 */
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

/**
 * Фиксирует размеры графика для оптимального отображения
 */
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

// Экспортируем функции
export {
    createChartSwitchButtons,
    setupCharts,
    renderChart,
    renderBarChart,
    fixChartContainerSize
};

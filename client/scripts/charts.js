// Модуль для работы с графиками
import { apiClient } from './utils/api';

// Функция для создания кнопок переключения метрик для графиков
export function createChartSwitchButtons(metrics, chartTabsContainer) {
    // Получаем контейнер для кнопок
    const chartTabs = chartTabsContainer || document.querySelector('.chart-tabs');
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

// Получение данных для графиков с сервера
export async function fetchChartData(shopId = null, categoryId = null, year = null) {
    try {
        // Формируем параметры запроса
        const params = {};
        if (shopId) params.shop_id = shopId;
        if (categoryId) params.category_id = categoryId;
        if (year) params.year = year;
        
        // Получаем все необходимые данные с сервера
        const metricsData = await apiClient.get('/finance/metrics/with-data', params);
        
        return metricsData;
    } catch (error) {
        console.error('Ошибка при получении данных для графиков:', error);
        throw error;
    }
}

// Настройка графиков и обработчиков событий
export async function setupCharts(shopId = null, categoryId = null, year = null) {
    try {
        // Получаем данные с сервера
        const metricsData = await fetchChartData(shopId, categoryId, year);
        
        // Если данных нет, выходим
        if (!metricsData || metricsData.length === 0) {
            const chartContainer = document.getElementById('hoursChart');
            if (chartContainer) {
                chartContainer.innerHTML = '<div class="no-data">Нет данных для отображения</div>';
            }
            return;
        }
        
        // Создаем кнопки переключения метрик
        createChartSwitchButtons(metricsData);
        
        // Получаем обновленные кнопки для переключения типа данных
        const chartTabs = document.querySelectorAll('.chart-tab');
        // Получаем кнопки для переключения вида (кварталы/месяцы)
        const chartViewBtns = document.querySelectorAll('.chart-view-btn');
        
        // Контейнер для графика
        const chartContainer = document.getElementById('hoursChart');
        // Заголовок графика
        const chartTitle = document.querySelector('.chart-title');
        
        // Текущая активная метрика (по умолчанию - первая метрика)
        let activeMetric = metricsData.length > 0 ? metricsData[0] : null;
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
                activeMetric = metricsData.find(m => m.id === metricId) || metricsData[0];
                
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
        
        // Если у нас есть метрики, отрисовываем первую
        if (activeMetric) {
            renderChart(activeMetric, activeView);
        }
    } catch (error) {
        console.error('Ошибка при настройке графиков:', error);
        const chartContainer = document.getElementById('hoursChart');
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="error">Ошибка при загрузке данных графика</div>';
        }
    }
}

// Функция для рендеринга графика
function renderChart(metric, view) {
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
        // Данные по кварталам уже доступны в агрегированной метрике с сервера
        // Для квартального вида группируем данные по кварталам
        for (let quarter = 1; quarter <= 4; quarter++) {
            // Фильтруем плановые значения для квартала
            const planValuesForQuarter = metric.planValues.filter(plan => {
                // Проверяем, что period_id принадлежит периоду с этим кварталом и без месяца
                const periodId = plan.period_id;
                return periodId && periodId.includes(quarter) && !periodId.includes('month');
            });
            
            // Суммируем плановые значения
            const planVal = planValuesForQuarter.reduce((sum, plan) => sum + parseFloat(plan.value), 0);
            
            // Фильтруем фактические значения для месяцев этого квартала
            const actualValuesForQuarter = metric.actualValues.filter(actual => {
                const periodId = actual.period_id;
                return periodId && periodId.includes(`quarter${quarter}`);
            });
            
            // Суммируем фактические значения
            const factVal = actualValuesForQuarter.reduce((sum, actual) => sum + parseFloat(actual.value), 0);
            
            chartData.push({
                label: `${quarter} квартал`,
                plan: planVal,
                fact: factVal
            });
        }
    } else {
        // Данные по месяцам уже доступны в агрегированной метрике с сервера
        // Для месячного вида группируем данные по месяцам
        const monthNames = {
            1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
            7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
        };
        
        // Для каждого месяца получаем данные
        for (let month = 1; month <= 12; month++) {
            // Фильтруем плановые значения для месяца
            const planValuesForMonth = metric.planValues.filter(plan => {
                const periodId = plan.period_id;
                return periodId && periodId.includes(`month${month}`);
            });
            
            // Суммируем плановые значения
            const planVal = planValuesForMonth.reduce((sum, plan) => sum + parseFloat(plan.value), 0);
            
            // Фильтруем фактические значения для месяца
            const actualValuesForMonth = metric.actualValues.filter(actual => {
                const periodId = actual.period_id;
                return periodId && periodId.includes(`month${month}`);
            });
            
            // Суммируем фактические значения
            const factVal = actualValuesForMonth.reduce((sum, actual) => sum + parseFloat(actual.value), 0);
            
            // Добавляем данные только если есть хоть какие-то значения
            if (planVal > 0 || factVal > 0) {
                chartData.push({
                    label: monthNames[month],
                    plan: planVal,
                    fact: factVal
                });
            }
        }
        
        // Сортируем месяцы в правильном порядке
        const monthOrder = Object.keys(monthNames).map(Number);
        chartData.sort((a, b) => {
            const monthA = monthOrder.findIndex(m => monthNames[m] === a.label);
            const monthB = monthOrder.findIndex(m => monthNames[m] === b.label);
            return monthA - monthB;
        });
    }
    
    // Функция для форматирования чисел
    const formatNumber = (value) => {
        return new Intl.NumberFormat('ru-RU').format(value);
    };
    
    // Рисуем график, передаем метрику в функцию renderBarChart
    renderBarChart(chartContainer, chartData, metric, formatNumber);
}

// Функция для рендеринга столбчатого графика
function renderBarChart(container, data, currentMetric, formatNumber) {
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
    
    // Если максимальное значение слишком большое, применяем адаптивное масштабирование
    // для предотвращения выхода столбиков за границы
    function scaleHeight(value) {
        // Прямое соотношение при нормальных значениях
        let scaledHeight = (value / maxValue * 100);
        
        // Если значение больше 90%, применяем логарифмическое масштабирование
        if (scaledHeight > 90) {
            // Ограничиваем высоту 95%
            scaledHeight = 90 + Math.log10(scaledHeight - 89);
        }
        
        // Максимум 98%
        return Math.min(scaledHeight, 98);
    }
    
    // Добавляем максимальное значение в верхней части графика для ориентира
    const maxValueDisplay = `<div class="chart-max-value">${formatNumber(maxValue)} ${currentMetric.unit}</div>`;
    
    // Создаем HTML для графика
    const chartHtml = `
        ${maxValueDisplay}
        <div class="chart-bars">
            ${data.map(item => {
                // Применяем масштабирование
                const planHeight = scaleHeight(item.plan);
                const factHeight = scaleHeight(item.fact);
                
                return `
                <div class="chart-bar-group">
                    <div class="chart-bars-container">
                        <div class="chart-bar chart-bar--plan" style="height: ${planHeight}%" data-label="План: ${formatNumber(item.plan)} ${currentMetric.unit}">
                            <div class="chart-bar-value">${formatNumber(item.plan)}</div>
                        </div>
                        <div class="chart-bar chart-bar--fact" style="height: ${factHeight}%" data-label="Факт: ${formatNumber(item.fact)} ${currentMetric.unit}">
                            <div class="chart-bar-value">${formatNumber(item.fact)}</div>
                        </div>
                    </div>
                    <div class="chart-bar-label">${item.label}</div>
                </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Добавляем HTML в контейнер
    container.innerHTML = chartHtml;
    
    // Добавляем стили для графика, если их еще нет
    if (!document.getElementById('chart-styles')) {
        const chartStyles = `
            .chart-max-value {
                text-align: right;
                font-size: 11px;
                color: var(--text-secondary);
                margin-bottom: 2px;
            }
            .chart-bars {
                display: flex;
                height: 180px; /* Уменьшаем высоту графика */
                align-items: flex-end;
                padding: 5px 0 40px 0; /* Увеличиваем нижний отступ для меток */
                overflow-x: auto; /* Добавляем прокрутку по горизонтали при необходимости */
                overflow-y: hidden;
                scroll-behavior: smooth;
                margin-top: 15px; /* Увеличиваем отступ сверху для значений */
                position: relative; /* Для позиционирования абсолютных элементов */
            }
            /* Добавляем линии сетки */
            .chart-bars::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: rgba(0,0,0,0.05);
                z-index: 1;
            }
            .chart-bars::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 1px;
                background: rgba(0,0,0,0.05);
                z-index: 1;
            }
            .chart-bar-group {
                flex: 0 0 auto; /* Изменяем flex-параметр, чтобы сохранять размер */
                min-width: 80px; /* Увеличиваем минимальную ширину для группы */
                max-width: 120px; /* Добавляем максимальную ширину */
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 0 5px;
                z-index: 2; /* Поверх сетки */
            }
            .chart-bar-label {
                margin-top: 15px; /* Увеличиваем отступ для меток */
                font-size: 12px;
                text-align: center;
                white-space: nowrap; /* Предотвращает перенос текста */
                position: absolute; /* Абсолютное позиционирование */
                bottom: 0; /* Размещаем в нижней части */
                left: 50%; /* Центрируем */
                transform: translateX(-50%); /* Центрируем */
                width: 100%; /* Полная ширина */
                padding: 5px 0; /* Добавляем отступы */
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
                min-height: 1px; /* Минимальная высота, чтобы были видны даже при нулевых значениях */
                max-height: 165px; /* Уменьшаем максимальную высоту */
                box-shadow: 0 0 2px rgba(0,0,0,0.1);
            }
            .chart-bar--plan {
                background-color: var(--primary-light); /* Светло-фиолетовый для плана */
            }
            .chart-bar--fact {
                background-color: var(--accent); /* Оранжевый для факта */
            }
            .chart-bar-value {
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 11px;
                white-space: nowrap;
                color: var(--text-secondary);
            }
            /* Скрываем значения, если они слишком маленькие или слишком большие */
            .chart-bar[style*="height: 0%"] .chart-bar-value,
            .chart-bar[style*="height: 1%"] .chart-bar-value,
            .chart-bar[style*="height: 2%"] .chart-bar-value,
            .chart-bar[style*="height: 3%"] .chart-bar-value,
            .chart-bar[style*="height: 95%"] .chart-bar-value,
            .chart-bar[style*="height: 96%"] .chart-bar-value,
            .chart-bar[style*="height: 97%"] .chart-bar-value,
            .chart-bar[style*="height: 98%"] .chart-bar-value {
                display: none;
            }
            /* В этом случае показываем значение в всплывающей подсказке */
            .chart-bar[style*="height: 95%"]::before,
            .chart-bar[style*="height: 96%"]::before,
            .chart-bar[style*="height: 97%"]::before,
            .chart-bar[style*="height: 98%"]::before {
                content: attr(data-label);
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 10px;
                white-space: nowrap;
                opacity: 0.5;
                z-index: 5;
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
                opacity: 1;
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
                height: 200px; /* Соответствует высоте графика */
                color: var(--text-secondary);
            }
            .no-metrics {
                padding: 10px;
                color: var(--text-secondary);
                text-align: center;
            }
            
            /* Улучшения для адаптивности */
            @media (max-width: 768px) {
                .chart-bars {
                    height: 160px; /* Еще меньшая высота для мобильных */
                }
                .chart-bar-group {
                    min-width: 70px;
                }
                .chart-bar {
                    width: 22px;
                    max-height: 150px;
                }
                .chart-bar-value {
                    font-size: 10px;
                    top: -18px;
                }
            }
            
            /* Стили для прокрутки */
            .chart-bars::-webkit-scrollbar {
                height: 6px;
            }
            .chart-bars::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            .chart-bars::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 3px;
            }
            .chart-bars::-webkit-scrollbar-thumb:hover {
                background: #aaa;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'chart-styles';
        styleElement.textContent = chartStyles;
        document.head.appendChild(styleElement);
    }
}

// Глобальные стили для графиков
export function addGlobalChartStyles() {
    if (!document.getElementById('global-chart-styles')) {
        const globalStyles = `
            .chart-container {
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 24px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .chart-title {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .chart-legend {
                display: flex;
                gap: 16px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: var(--text-secondary);
            }
            
            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 2px;
            }
            
            .legend-color--plan {
                background-color: var(--primary-light);
            }
            
            .legend-color--fact {
                background-color: var(--primary);
            }
            
            .chart-controls {
                display: flex;
                justify-content: space-between;
                margin-bottom: 16px;
            }
            
            .chart-tabs {
                display: flex;
                border: 1px solid var(--border);
                border-radius: 6px;
                overflow: hidden;
            }
            
            .chart-tab {
                padding: 8px 16px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-secondary);
                transition: background-color 0.2s, color 0.2s;
            }
            
            .chart-tab.active {
                background-color: var(--primary);
                color: white;
            }
            
            .chart-view-toggle {
                display: flex;
                border: 1px solid var(--border);
                border-radius: 6px;
                overflow: hidden;
            }
            
            .chart-view-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-secondary);
                transition: background-color 0.2s, color 0.2s;
            }
            
            .chart-view-btn.active {
                background-color: var(--primary-light);
                color: var(--primary);
            }
            
            /* Адаптивность */
            @media (max-width: 768px) {
                .chart-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .chart-controls {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .chart-tab, .chart-view-btn {
                    padding: 6px 12px;
                    font-size: 13px;
                }
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'global-chart-styles';
        styleElement.textContent = globalStyles;
        document.head.appendChild(styleElement);
    }
} 
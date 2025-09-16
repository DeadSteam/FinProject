import { ApiClient } from './http/ApiClient';
// PPTX экспорт удален
import { promisePool, mapToTasks } from '../components/charts/utils/promisePool';

class ReportsService {
    constructor() {
        this.apiClient = new ApiClient();
    }

    // Склейка двух dataURL PNG в одно изображение 2x1
    async mergeImagesSideBySide(leftDataUrl, rightDataUrl) {
        const leftImg = await this.loadImage(leftDataUrl);
        const rightImg = await this.loadImage(rightDataUrl);
        const width = leftImg.width + rightImg.width;
        const height = Math.max(leftImg.height, rightImg.height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(leftImg, 0, 0);
        ctx.drawImage(rightImg, leftImg.width, 0);
        return canvas.toDataURL('image/png', 1.0);
    }

    loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    async getMetricsForCategory(categoryId) {
        try {
            const params = new URLSearchParams();
            if (categoryId && categoryId !== 'all') {
                params.append('category_id', categoryId);
            }
            const url = `/finance/metrics?${params}`;
            const response = await this.apiClient.get(url);
            const metrics = Array.isArray(response) ? response : (response.data || []);
            return metrics;
        } catch (error) {
            console.error('❌ ReportsService: Ошибка загрузки метрик:', error);
            console.error('❌ ReportsService: Детали ошибки:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Получение данных для финансовых слайдов
     */
    async getFinanceDataForSlide(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.year) params.append('year', filters.year);
            if (filters.shop && filters.shop !== 'all') params.append('shop_id', filters.shop);
            if (filters.category && filters.category !== 'all') params.append('category_id', filters.category);
            if (filters.metric && filters.metric !== 'all') params.append('metric_id', filters.metric);
            
            const response = await this.apiClient.get(`/finance/metrics/with-data?${params}`);
            
            // Преобразуем данные в формат для графиков
            const chartData = this.prepareFinanceChartData(response, filters);
            
            return {
                chartData: chartData,
                tableData: this.prepareFinanceTableData(response, filters),
                tableColumns: this.getFinanceTableColumns(filters),
                selectedMetrics: this.getSelectedMetrics(filters),
                shopName: this.getShopName(filters.shop),
                categoryName: this.getCategoryName(filters.category),
                metricName: this.getMetricName(filters.metric),
                rawData: response
            };
        } catch (error) {
            console.error('❌ ReportsService: Ошибка загрузки финансовых данных:', error);
            console.error('❌ ReportsService: Детали ошибки:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Подготовка данных для финансовых графиков
     */
    prepareFinanceChartData(rawData, filters) {
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return [];
        }

        const periodType = filters.periodType || 'quarters';
        const chartData = [];


        rawData.forEach((metric, index) => {
            
            const periods = metric.periods;
            
            if (!periods) {
                return;
            }

            let periodData = [];
            
            if (periodType === 'quarters' && periods.quarters) {
                periodData = Object.entries(periods.quarters)
                    .filter(([quarter, data]) => data && (data.actual !== null || data.plan !== null))
                    .map(([quarter, data]) => ({
                        label: `Q${quarter}`,
                        plan: data.plan || 0,
                        fact: data.actual || 0,
                        deviation: (data.plan || 0) - (data.actual || 0)
                    }));
            } else if (periodType === 'months' && periods.months) {
                periodData = Object.entries(periods.months)
                    .filter(([month, data]) => data && (data.actual !== null || data.plan !== null))
                    .map(([month, data]) => ({
                        label: this.getMonthName(parseInt(month)),
                        plan: data.plan || 0,
                        fact: data.actual || 0,
                        deviation: (data.plan || 0) - (data.actual || 0)
                    }));
            } else if (periodType === 'year' && periods.year) {
                periodData = [{
                    label: 'Год',
                    plan: periods.year.plan || 0,
                    fact: periods.year.actual || 0,
                    deviation: (periods.year.plan || 0) - (periods.year.actual || 0)
                }];
            } else {
                
                // Попробуем использовать кварталы по умолчанию, если они есть
                if (periods.quarters) {
                    periodData = Object.entries(periods.quarters)
                        .filter(([quarter, data]) => data && (data.actual !== null || data.plan !== null))
                        .map(([quarter, data]) => ({
                            label: `Q${quarter}`,
                            plan: data.plan || 0,
                            fact: data.actual || 0,
                            deviation: (data.plan || 0) - (data.actual || 0)
                        }));
                }
            }


            if (periodData.length > 0) {
                // Добавляем данные периода напрямую в chartData
                // Chart компонент ожидает плоский массив объектов с полями plan, fact, deviation
                chartData.push(...periodData);
            } else {
            }
        });

        
        // Если нет данных, создаем тестовые данные для демонстрации
        if (chartData.length === 0) {
            chartData.push(
                { label: 'I квартал', plan: 100, fact: 120, deviation: 20 },
                { label: 'II квартал', plan: 150, fact: 140, deviation: -10 },
                { label: 'III квартал', plan: 200, fact: 180, deviation: -20 },
                { label: 'IV квартал', plan: 180, fact: 200, deviation: 20 }
            );
        }
        
        // Проверяем структуру данных перед возвратом
        
        return chartData;
    }

    /**
     * Подготовка данных для финансовых таблиц
     */
    prepareFinanceTableData(rawData, filters) {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return [];
        }

        const tableData = [];
        const periodType = filters.periodType || 'quarters';

        rawData.forEach(metric => {
            const periods = metric.periods;
            if (!periods) return;

            let periodData = [];
            
            if (periodType === 'quarters' && periods.quarters) {
                periodData = Object.entries(periods.quarters).map(([quarter, data]) => ({
                    period: `Q${quarter}`,
                    plan: data.plan || 0,
                    fact: data.actual || 0,
                    deviation: (data.plan || 0) - (data.actual || 0),
                    deviationPercent: data.plan ? (((data.plan || 0) - (data.actual || 0)) / data.plan * 100) : 0
                }));
            } else if (periodType === 'months' && periods.months) {
                periodData = Object.entries(periods.months).map(([month, data]) => ({
                    period: this.getMonthName(parseInt(month)),
                    plan: data.plan || 0,
                    fact: data.actual || 0,
                    deviation: (data.plan || 0) - (data.actual || 0),
                    deviationPercent: data.plan ? (((data.plan || 0) - (data.actual || 0)) / data.plan * 100) : 0
                }));
            }

            if (periodData.length > 0) {
                tableData.push({
                    metric: metric.metric_name,
                    category: metric.category_name,
                    unit: metric.unit,
                    periods: periodData
                });
            }
        });

        return tableData;
    }

    /**
     * Получение колонок для финансовых таблиц
     */
    getFinanceTableColumns(filters) {
        return [
            { key: 'metric', label: 'Метрика', sortable: true },
            { key: 'category', label: 'Категория', sortable: true },
            { key: 'unit', label: 'Единица', sortable: false },
            { key: 'period', label: 'Период', sortable: true },
            { key: 'plan', label: 'План', sortable: true, type: 'number' },
            { key: 'fact', label: 'Факт', sortable: true, type: 'number' },
            { key: 'deviation', label: 'Отклонение', sortable: true, type: 'number' },
            { key: 'deviationPercent', label: '% выполнения', sortable: true, type: 'number' }
        ];
    }

    /**
     * Получение выбранных метрик для отображения
     */
    getSelectedMetrics(filters) {
        const metrics = [];
        if (filters.showPlan !== false) metrics.push('plan');
        if (filters.showFact !== false) metrics.push('fact');
        if (filters.showDeviation === true) metrics.push('deviation');
        
        
        return metrics;
    }

    /**
     * Получение названия магазина
     */
    getShopName(shopId) {
        if (!shopId || shopId === 'all') return 'Все магазины';
        return `Магазин ${shopId}`;
    }

    /**
     * Получение названия категории
     */
    getCategoryName(categoryId) {
        if (!categoryId || categoryId === 'all') return 'Все категории';
        return `Категория ${categoryId}`;
    }

    /**
     * Получение названия метрики
     */
    getMetricName(metricId) {
        if (!metricId || metricId === 'all') return 'Все метрики';
        return `Метрика ${metricId}`;
    }

    /**
     * Получение названия месяца
     */
    getMonthName(month) {
        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        return months[month - 1] || `Месяц ${month}`;
    }

    /**
     * Захват графика как изображения с использованием html-to-image
     */
    async captureChartAsImageWithHtmlToImage(chartElement, options = {}) {
        try {
            if (!chartElement) {
                console.warn('Chart element not found for capture');
                return null;
            }

            // Дополнительная проверка, что элемент видимый
            if (chartElement.offsetWidth === 0 || chartElement.offsetHeight === 0) {
                console.warn('Chart element has zero dimensions');
                return null;
            }

            // Минимальное время ожидания, так как анимации полностью отключены при экспорте
            await new Promise(resolve => setTimeout(resolve, 200)); // Сократили до 200мс
            
            // Умная проверка готовности графика с учетом анимаций
            let attempts = 0;
            let isGraphicReady = false;
            
            while (attempts < 5 && !isGraphicReady) { // Сократили до 5 попыток
                // Проверяем наличие визуальных элементов
                const hasVisibleContent = chartElement.querySelector('rect, path, circle, line, text, .bar, .line, .point');
                
                // Проверяем завершение CSS анимаций
                const allAnimatedElements = chartElement.querySelectorAll('*');
                let hasActiveAnimations = false;
                
                for (const element of allAnimatedElements) {
                    const computedStyle = window.getComputedStyle(element);
                    // Проверяем CSS анимации и переходы
                    if (computedStyle.animationName !== 'none' || 
                        computedStyle.transitionProperty !== 'none' ||
                        element.style.opacity === '0' ||
                        element.style.transform?.includes('scale(0)') ||
                        element.style.transform?.includes('translateY')) {
                        hasActiveAnimations = true;
                        break;
                    }
                }
                
                // Проверяем размеры элементов (анимация может изменять размеры)
                const chartBars = chartElement.querySelectorAll('.bar, [class*="bar"], rect[height], [class*="Chart-module__chartBar"]');
                let barsFullyRendered = true;
                let maxBarHeight = 0;
                
                if (chartBars.length > 0) {
                    
                    for (const bar of chartBars) {
                        const rect = bar.getBoundingClientRect();
                        const computedStyle = window.getComputedStyle(bar);
                        
                        // Проверяем высоту бара
                        if (rect.height < 20) { // Увеличили минимальную высоту
                            barsFullyRendered = false;
                            break;
                        }
                        
                        // Проверяем CSS свойства анимации
                        if (computedStyle.transform && computedStyle.transform !== 'none') {
                            barsFullyRendered = false;
                            break;
                        }
                        
                        // Проверяем opacity
                        if (parseFloat(computedStyle.opacity) < 0.9) {
                            barsFullyRendered = false;
                            break;
                        }
                        
                        maxBarHeight = Math.max(maxBarHeight, rect.height);
                    }
                    
                    
                    // Дополнительная проверка - если максимальная высота баров слишком маленькая
                    if (maxBarHeight < 50) {
                        barsFullyRendered = false;
                    }
                }
                
                if (hasVisibleContent && !hasActiveAnimations && barsFullyRendered) {
                    isGraphicReady = true;
                    
                    // Дополнительная пауза для полной уверенности
                    await new Promise(resolve => setTimeout(resolve, 500));
                    break;
                }
                
                
                await new Promise(resolve => setTimeout(resolve, 200)); // Сократили интервал до 200мс
                attempts++;
            }
            
            if (!isGraphicReady) {
                // График может быть не полностью готов, но продолжаем захват (таймаут)
            }
            
            // Удалено: html-to-image/html2canvas больше не используются
            return null;

        } catch (error) {
            console.error('Error capturing chart with html-to-image:', error);
            return null;
        }
    }

    /**
     * Захват графика как изображения
     */
    async captureChartAsImage(chartElement, options = {}) {
        try {
            if (!chartElement) {
                console.warn('Chart element not found for capture');
                return null;
            }

            // Дополнительная проверка, что элемент видимый
            if (chartElement.offsetWidth === 0 || chartElement.offsetHeight === 0) {
                console.warn('Chart element has zero dimensions');
                return null;
            }

            // Проверяем, есть ли SVG элементы в графике
            const svgElements = chartElement.querySelectorAll('svg');
            const canvasElements = chartElement.querySelectorAll('canvas');
            
            
            // Если есть SVG элементы, пытаемся их обработать
            if (svgElements.length > 0) {
                
                // Ждем, чтобы SVG полностью отрендерился
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Принудительно перерисовываем SVG
                svgElements.forEach(svg => {
                    svg.style.display = 'none';
                    svg.offsetHeight; // Force reflow
                    svg.style.display = 'block';
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Ждем еще немного, чтобы убедиться, что все анимации завершены
            await new Promise(resolve => setTimeout(resolve, 200));

            // Удалено: html2canvas больше не используется
            return null;
        } catch (error) {
            console.error('Error capturing chart as image:', error);
            return null;
        }
    }

    /**
     * Захват всех графиков в отчете (через AG Charts API)
     */
    async captureAllCharts(report) {
        const chartImages = new Map();
        // Порядок берем из миниатюр, если они есть (включая части __partN)
        const thumbEls = Array.from(document.querySelectorAll('.thumbnails-list .thumbnail-item[data-slide-id]'));
        const orderedIds = thumbEls.map((el) => el.getAttribute('data-slide-id')).filter(Boolean);
        const baseSlides = (report.slides || []).filter((s) => this.isChartSlide(s.type));
        const slides = orderedIds.length
            ? orderedIds.map((id) => ({ id, type: (baseSlides.find(b => id === b.id || id.startsWith(`${b.id}__part`))?.type) || 'analytics-chart', title: baseSlides.find(b => id === b.id || id.startsWith(`${b.id}__part`))?.title }))
            : baseSlides;

        const toPngDataUrl = (canvas) => {
            // Принудительно рисуем на белом фоне для корректного экспорта
            const tmp = document.createElement('canvas');
            tmp.width = canvas.width;
            tmp.height = canvas.height;
            const ctx = tmp.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tmp.width, tmp.height);
            ctx.drawImage(canvas, 0, 0);
            return tmp.toDataURL('image/png', 1.0);
        };

        const clickThumbnailAndWait = async (slideId) => {
            const thumb = document.querySelector(`.thumbnails-list .thumbnail-item[data-slide-id="${slideId}"]`);
            if (thumb) {
                thumb.click();
                await new Promise(r => setTimeout(r, 50));
            }
            // ждём пока основной контейнер перерисуется под нужный slideId
            const deadline = Date.now() + 2500;
            let main = null;
            do {
                main = document.querySelector(`.main-slide-area .slide-container[data-slide-id="${slideId}"]`);
                if (main) break;
                await new Promise(r => setTimeout(r, 100));
            } while (Date.now() < deadline);

            if (!main) main = document.querySelector('.main-slide-area .slide-container');
            if (main) {
                await this.waitForChartToRender(main, 2000);
                await new Promise(r => setTimeout(r, 200));
            } else {
                await new Promise(r => setTimeout(r, 300));
            }
        };

        const tasks = mapToTasks(slides, async (slide) => {
            try {
                // Активируем нужный слайд в UI, чтобы графики точно отрендерились
                await clickThumbnailAndWait(slide.id);

                const root = this.findChartElement(slide.id);
                if (!root) return;

                // Собираем все canvas внутри root (AG Charts и возможные обёртки)
                let canvases = Array.from(
                    root.querySelectorAll('.ag-chart-container canvas, canvas')
                ).filter((c) => c.width > 0 && c.height > 0);

                // Если по какой-то причине ничего не нашли, пробуем искать по самому slideId
                if (canvases.length === 0) {
                    const scope = document.querySelector(`[data-slide-id="${slide.id}"]`) || root;
                    canvases = Array.from(scope.querySelectorAll('canvas')).filter((c) => c.width > 0 && c.height > 0);
                }

                // Сортируем сверху-вниз, слева-направо, чтобы сохранить порядок
                canvases = canvases
                    .map((c) => ({ c, r: c.getBoundingClientRect() }))
                    .sort((a, b) => (a.r.top - b.r.top) || (a.r.left - b.r.left))
                    .map(({ c }) => c);

                if (canvases.length === 0) return;

                // Ожидаем, пока графики стабилизируются
                await this.waitForChartToRender(root, 1800);

                // Преобразуем и удаляем дубликаты по содержимому
                const seen = new Set();
                const images = [];
                for (const c of canvases) {
                    try {
                        const data = toPngDataUrl(c);
                        if (!seen.has(data)) {
                            seen.add(data);
                            images.push(data);
                        }
                    } catch (_) {}
                }

                if (images.length > 0) {
                    chartImages.set(slide.id, images);
                }
            } catch (e) {
                console.warn('capture slide failed', slide.id, e);
            }
        });

        await promisePool(tasks, 4);
        // Возвращаем карту и порядок
        return { imagesBySlide: chartImages, order: slides.map(s => s.id) };
    }


    /**
     * Поиск элемента графика с расширенными селекторами
     */
    findChartElement(slideId) {
        // 0) Сначала ищем активный основной контейнер конкретного слайда по data-slide-id
        const mainExact = document.querySelector(`.main-slide-area .slide-container[data-slide-id="${slideId}"]`);
        if (mainExact && mainExact.offsetWidth > 0 && mainExact.offsetHeight > 0) {
            // Внутри него пытаемся найти специфичные контейнеры графиков (comparison, reports charts)
            const deepSelectors = [
                '.comparison-container.reports-chart-container > div > div',
                '.reports-chart-container .ag-chart-container',
                '.chart-container .ag-chart-container',
                '.chart-container',
            ];
            for (const sel of deepSelectors) {
                const el = mainExact.querySelector(sel);
                if (el && el.offsetWidth > 0 && el.offsetHeight > 0) return el;
            }
            return mainExact;
        }
        // 1) СНАЧАЛА: ищем в export контейнере (скрытый рендер всех слайдов)
        const exportContainer = document.getElementById('export-slides-container');
        if (exportContainer) {
            
            const exportSelectors = [
                `#export-slides-container [data-slide-id="${slideId}"]`,
                `#export-slides-container [data-slide-id="${slideId}"] .chart-container`,
                `#export-slides-container [data-slide-id="${slideId}"] .chart`,
                `#export-slides-container [data-slide-id="${slideId}"] .chart-slide-content`,
                `#export-slides-container [data-slide-id="${slideId}"] .chart-full-width`,
                `#export-slides-container [data-slide-id="${slideId}"] .comparison-full-width`,
                `#export-slides-container [data-slide-id="${slideId}"] [class*="Chart-module"]`,
                `#export-slides-container [data-slide-id="${slideId}"] svg`,
                `#export-slides-container [data-slide-id="${slideId}"] canvas`
            ];

            for (const selector of exportSelectors) {
                const element = exportContainer.querySelector(selector);
                if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
                    const textContent = element.textContent || '';
                    const hasChartData = textContent.includes('квартал') || textContent.includes('План') || textContent.includes('Факт') || textContent.includes('График');
                    
                    return element;
                }
            }
        }

        // 2) ПРИОРИТЕТ 2: ищем в preview области (видимый график после переключения)
        const previewSelectors = [
            `.main-slide-area .slide-container[data-slide-id="${slideId}"] .comparison-container.reports-chart-container > div > div`,
            `.main-slide-area .slide-container[data-slide-id="${slideId}"] .reports-chart-container .ag-chart-container`,
            `.main-slide-area .slide-container[data-slide-id="${slideId}"] .chart-container .ag-chart-container`,
            `.main-slide-area .slide-container[data-slide-id="${slideId}"] .chart-container`,
            `.main-slide-area .slide-container[data-slide-id="${slideId}"]`,
            `.slide-container[data-slide-id="${slideId}"]`,
            `#root [data-slide-id="${slideId}"] .comparison-container.reports-chart-container > div > div`,
            `#root [data-slide-id="${slideId}"] .reports-chart-container .ag-chart-container`,
            `#root [data-slide-id="${slideId}"] .chart-container`,
            `#root [data-slide-id="${slideId}"]`,
        ];
        for (const selector of previewSelectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
                return element;
            }
        }

        // Список возможных селекторов для поиска графиков в основном DOM
        const selectors = [
            `[data-slide-id="${slideId}"] .chart-container`,
            `[data-slide-id="${slideId}"] .chart`,
            `[data-slide-id="${slideId}"] .chart-slide-content`,
            `[data-slide-id="${slideId}"] .chart-full-width`,
            `[data-slide-id="${slideId}"]`,
            // Поиск по классам Chart компонента
            `[data-slide-id="${slideId}"] .chartContainer`,
            `[data-slide-id="${slideId}"] .chartBarContainer`,
            // Поиск SVG элементов
            `[data-slide-id="${slideId}"] svg`,
            `[data-slide-id="${slideId}"] canvas`,
            // Поиск в скрытых элементах экспорта
            `[data-slide-id="${slideId}"][style*="position: absolute"]`,
            `[data-slide-id="${slideId}"][style*="visibility: hidden"]`
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }

        // Если не нашли по селекторам, ищем все элементы с data-slide-id
        const allSlideElements = document.querySelectorAll(`[data-slide-id="${slideId}"]`);
        if (allSlideElements.length > 0) {
            // Возвращаем первый найденный элемент
            return allSlideElements[0];
        }

        console.warn(`❌ Элемент графика не найден для слайда ${slideId}`);
        return null;
    }

    /**
     * Принудительный рендеринг всех слайдов
     */
    async forceRenderAllSlides(report) {
        
        // Проверяем, есть ли уже контейнер экспорта
        const exportContainer = document.getElementById('export-slides-container');
        if (exportContainer) {
            return;
        }
        
        // Создаем временный контейнер для рендеринга всех слайдов
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: absolute;
            left: -9999px;
            top: -9999px;
            width: 800px;
            height: 600px;
            overflow: hidden;
            visibility: hidden;
            pointer-events: none;
        `;
        tempContainer.id = 'temp-chart-render-container';
        
        // Удаляем старый контейнер, если есть
        const existingContainer = document.getElementById('temp-chart-render-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        document.body.appendChild(tempContainer);
        
        try {
            // Рендерим каждый слайд с графиком
            for (const slide of report.slides) {
                if (this.isChartSlide(slide.type)) {
                    
                    const slideElement = document.createElement('div');
                    slideElement.setAttribute('data-slide-id', slide.id);
                    slideElement.setAttribute('data-slide-type', slide.type);
                    slideElement.style.cssText = `
                        width: 800px;
                        height: 600px;
                        margin-bottom: 20px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 20px;
                        background-color: #ffffff;
                        position: relative;
                    `;
                    
                    // Создаем заголовок слайда
                    const title = document.createElement('h2');
                    title.textContent = slide.title || 'График';
                    title.style.cssText = 'margin-bottom: 20px; font-size: 18px; color: #333;';
                    slideElement.appendChild(title);
                    
                    // Создаем контейнер для графика
                    const chartContainer = document.createElement('div');
                    chartContainer.className = 'chart-container';
                    chartContainer.style.cssText = `
                        width: 100%;
                        height: 400px;
                        position: relative;
                    `;
                    slideElement.appendChild(chartContainer);
                    
                    // Добавляем в временный контейнер
                    tempContainer.appendChild(slideElement);
                    
                    // Небольшая пауза для рендеринга
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // Ждем, чтобы все элементы успели отрендериться
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            
        } catch (error) {
            console.error('❌ Ошибка принудительного рендеринга слайдов:', error);
        } finally {
            // Удаляем временный контейнер после небольшой задержки
            setTimeout(() => {
                if (tempContainer.parentNode) {
                    tempContainer.remove();
                }
            }, 2000);
        }
    }

    /**
     * Ожидание полного рендеринга графика
     */
    async waitForChartToRender(chartElement, maxWaitTime = 3000) { // Сокращаем время т.к. анимации отключены
        return new Promise((resolve) => {
            const startTime = Date.now();
            let attempts = 0;
            
            const checkChart = () => {
                attempts++;
                
                // Проверяем, есть ли столбцы графика
                const bars = chartElement.querySelectorAll('.chart-bar, [class*="chartBar"], rect, circle, path, .bar, [class*="Chart-module__chartBar"]');
                const hasBars = bars.length > 0;
                
                // Проверяем, есть ли SVG элементы
                const svgElements = chartElement.querySelectorAll('svg');
                const hasSvg = svgElements.length > 0;
                
                // Проверяем, есть ли canvas элементы
                const canvasElements = chartElement.querySelectorAll('canvas');
                const hasCanvas = canvasElements.length > 0;
                
                // Проверяем, есть ли данные в графике
                const hasData = chartElement.textContent && 
                    !chartElement.textContent.includes('Нет данных') &&
                    !chartElement.textContent.includes('Загрузка') &&
                    !chartElement.textContent.includes('Loading');
                
                // Проверяем, что график видимый
                const isVisible = chartElement.offsetWidth > 0 && chartElement.offsetHeight > 0;
                
                // Проверяем, что SVG элементы имеют размеры
                const svgHasSize = svgElements.length === 0 || 
                    Array.from(svgElements).every(svg => svg.offsetWidth > 0 && svg.offsetHeight > 0);
                
                // НОВАЯ ПРОВЕРКА: проверяем высоту баров
                let barsFullyRendered = true;
                if (bars.length > 0) {
                    for (const bar of bars) {
                        const computedStyle = window.getComputedStyle(bar);
                        const height = parseFloat(computedStyle.height);
                        const opacity = parseFloat(computedStyle.opacity || '1');
                        
                        // Проверяем что бар имеет нормальную высоту и видимость
                        if (height < 5 || opacity < 0.8) {
                            barsFullyRendered = false;
                            break;
                        }
                    }
                }
                
                
                // Более строгие условия для готовности графика
                if (isVisible && barsFullyRendered && (hasBars || hasSvg || hasCanvas) && svgHasSize) {
                    // Дополнительная пауза для стабилизации
                    setTimeout(resolve, 300);
                } else if (Date.now() - startTime > maxWaitTime) {
                    resolve();
                } else {
                    // Ждем еще 400ms и проверяем снова (увеличиваем интервал)
                    setTimeout(checkChart, 400);
                }
            };
            
            checkChart();
        });
    }

    /**
     * Проверка, является ли слайд графиком
     */
    isChartSlide(slideType) {
        return ['analytics-chart', 'finance-chart', 'trends', 'plan-vs-actual', 'comparison'].includes(slideType);
    }

    // Генерация PDF удалена

    // Генерация PowerPoint удалена

    // Серверный экспорт PDF удален

    /**
     * Экспорт в PowerPoint через сервер
     */
    // Серверный экспорт PowerPoint удален

    /**
     * Скачивание экспортированного файла
     */
    async downloadExport(downloadUrl) {
        try {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('❌ ReportsService: Ошибка скачивания файла:', error);
            throw error;
        }
    }
}

export default new ReportsService();
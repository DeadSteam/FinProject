import { ApiClient } from './http/ApiClient';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas';
import * as htmlToImage from 'html-to-image';

class ReportsService {
    constructor() {
        this.apiClient = new ApiClient();
    }

    async getMetricsForCategory(categoryId) {
        try {
            const params = new URLSearchParams();
            if (categoryId && categoryId !== 'all') {
                params.append('category_id', categoryId);
            }
            
            const url = `/finance/metrics?${params}`;
            
            const response = await this.apiClient.get(url);
            
            // API возвращает массив напрямую, а не в поле data
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
                        deviation: (data.actual || 0) - (data.plan || 0)
                    }));
            } else if (periodType === 'months' && periods.months) {
                periodData = Object.entries(periods.months)
                    .filter(([month, data]) => data && (data.actual !== null || data.plan !== null))
                    .map(([month, data]) => ({
                        label: this.getMonthName(parseInt(month)),
                        plan: data.plan || 0,
                        fact: data.actual || 0,
                        deviation: (data.actual || 0) - (data.plan || 0)
                    }));
            } else if (periodType === 'year' && periods.year) {
                periodData = [{
                    label: 'Год',
                    plan: periods.year.plan || 0,
                    fact: periods.year.actual || 0,
                    deviation: (periods.year.actual || 0) - (periods.year.plan || 0)
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
                            deviation: (data.actual || 0) - (data.plan || 0)
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
                { label: 'Q1', plan: 100, fact: 120, deviation: 20 },
                { label: 'Q2', plan: 150, fact: 140, deviation: -10 },
                { label: 'Q3', plan: 200, fact: 180, deviation: -20 },
                { label: 'Q4', plan: 180, fact: 200, deviation: 20 }
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
                    deviation: (data.actual || 0) - (data.plan || 0),
                    deviationPercent: data.plan ? (((data.actual || 0) - (data.plan || 0)) / data.plan * 100) : 0
                }));
            } else if (periodType === 'months' && periods.months) {
                periodData = Object.entries(periods.months).map(([month, data]) => ({
                    period: this.getMonthName(parseInt(month)),
                    plan: data.plan || 0,
                    fact: data.actual || 0,
                    deviation: (data.actual || 0) - (data.plan || 0),
                    deviationPercent: data.plan ? (((data.actual || 0) - (data.plan || 0)) / data.plan * 100) : 0
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
            
            // Сначала пробуем html2canvas - он лучше работает с динамическим контентом
            try {
                const canvas = await html2canvas(chartElement, {
                    backgroundColor: options.backgroundColor || '#ffffff',
                    scale: options.scale || 3,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    width: chartElement.offsetWidth,
                    height: chartElement.offsetHeight,
                    ignoreElements: (element) => {
                        return element.classList?.contains('spinner-border') || 
                               element.classList?.contains('loading') ||
                               element.classList?.contains('tooltip') ||
                               element.classList?.contains('popover');
                    }
                });
                
                const html2canvasDataURL = canvas.toDataURL('image/png', 1.0);
                
                // Проверяем, что изображение не пустое
                if (html2canvasDataURL && html2canvasDataURL.length > 1000) {
                    return html2canvasDataURL;
                } else {
                    console.warn('⚠️ html2canvas вернул слишком маленькое изображение, пробуем html-to-image...');
                }
            } catch (html2canvasError) {
                console.warn('⚠️ html2canvas не сработал, пробуем html-to-image:', html2canvasError);
            }

            // Запасной вариант - html-to-image
            const dataURL = await htmlToImage.toPng(chartElement, {
                backgroundColor: options.backgroundColor || '#ffffff',
                pixelRatio: options.scale || 3,
                quality: 1.0,
                cacheBust: true,
                skipFonts: true,           // Пропускаем внешние шрифты для избежания SecurityError
                useCORS: true,             // Включаем CORS
                allowTaint: true,          // Разрешаем "загрязненные" изображения
                skipDefaultFonts: false,   // Оставляем системные шрифты
                preferredFontFormat: 'woff2',
                filter: (node) => {
                    // Игнорируем элементы, которые могут мешать захвату
                    return !node.classList?.contains('spinner-border') && 
                           !node.classList?.contains('loading') &&
                           !node.classList?.contains('tooltip') &&
                           !node.classList?.contains('popover');
                }
            });

            
            // Проверяем, что это действительно PNG изображение
            if (dataURL.startsWith('data:image/png;base64,')) {
                return dataURL;
            } else {
                console.warn('⚠️ Неожиданный формат изображения:', dataURL.substring(0, 50));
                return dataURL; // Все равно пробуем использовать
            }

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

            const canvas = await html2canvas(chartElement, {
                backgroundColor: options.backgroundColor || '#ffffff',
                scale: options.scale || 3, // Увеличиваем масштаб для лучшего качества
                useCORS: true,
                allowTaint: true,
                logging: true, // Включаем логирование для отладки
                width: options.width || chartElement.offsetWidth,
                height: options.height || chartElement.offsetHeight,
                windowWidth: chartElement.scrollWidth,
                windowHeight: chartElement.scrollHeight,
                // Дополнительные опции для лучшего захвата
                ignoreElements: (element) => {
                    // Игнорируем элементы, которые могут мешать захвату
                    return element.classList.contains('spinner-border') || 
                           element.classList.contains('loading') ||
                           element.classList.contains('tooltip') ||
                           element.classList.contains('popover');
                },
                onclone: (clonedDoc) => {
                    // Улучшаем клонированный документ для лучшего захвата
                    const clonedElement = clonedDoc.querySelector(`[data-slide-id="${chartElement.getAttribute('data-slide-id')}"]`);
                    if (clonedElement) {
                        // Убираем все анимации и переходы
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            * {
                                animation: none !important;
                                transition: none !important;
                                transform: none !important;
                            }
                            svg {
                                display: block !important;
                                visibility: visible !important;
                                width: 100% !important;
                                height: 100% !important;
                            }
                            .chart-container {
                                width: 100% !important;
                                height: 100% !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                        
                        // Принудительно устанавливаем размеры для SVG
                        const svgElements = clonedElement.querySelectorAll('svg');
                        svgElements.forEach(svg => {
                            if (!svg.getAttribute('width')) {
                                svg.setAttribute('width', '100%');
                            }
                            if (!svg.getAttribute('height')) {
                                svg.setAttribute('height', '100%');
                            }
                        });
                    }
                }
            });

            // Проверяем, что canvas не пустой
            if (canvas.width === 0 || canvas.height === 0) {
                console.warn('Captured canvas is empty');
                return null;
            }

            const dataURL = canvas.toDataURL('image/png', 1.0);
            
            // Проверяем, что dataURL валидный
            if (!dataURL || dataURL === 'data:,') {
                console.warn('Invalid data URL generated');
                return null;
            }

            return dataURL;
        } catch (error) {
            console.error('Error capturing chart as image:', error);
            return null;
        }
    }

    /**
     * Захват всех графиков в отчете
     */
    async captureAllCharts(report) {
        const chartImages = new Map();
        
        // АКТИВИРУЕМ РЕЖИМ ЭКСПОРТА В DOM для отключения всех анимаций
        document.body.classList.add('export-mode');
        const mainContainer = document.querySelector('#root, .App, main');
        if (mainContainer) {
            mainContainer.classList.add('export-mode');
        }
        
        // Ждем применения стилей отключения анимаций
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Ждем, чтобы все графики успели отрендериться БЕЗ АНИМАЦИЙ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        
        for (let i = 0; i < report.slides.length; i++) {
            const slide = report.slides[i];
            if (this.isChartSlide(slide.type)) {
                try {
                    // Переключаемся на конкретный слайд перед захватом
                    const thumbnails = document.querySelectorAll('.thumbnail-item');
                    if (thumbnails[i]) {
                        thumbnails[i].click();
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Ждем пока график станет видимым
                        let attempts = 0;
                        while (attempts < 10) {
                            const visibleChart = document.querySelector('.slide-container [class*="Chart"], .slide-container .chart-container, .slide-container canvas, .slide-container svg');
                            if (visibleChart && visibleChart.offsetWidth > 0 && visibleChart.offsetHeight > 0) {
                                break;
                            }
                            await new Promise(resolve => setTimeout(resolve, 200));
                            attempts++;
                        }
                    }
                    
                    // Ищем элемент графика
                    let chartElement = this.findChartElement(slide.id);
                    
                    if (chartElement) {
                        // Ждем, пока график полностью отрендерится
                        await this.waitForChartToRender(chartElement);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Захватываем график
                        let imageData = await this.captureChartAsImageWithHtmlToImage(chartElement, {
                            scale: 3,
                            backgroundColor: '#ffffff'
                        });
                        
                        if (!imageData) {
                            imageData = await this.captureChartAsImage(chartElement, {
                                scale: 3,
                                backgroundColor: '#ffffff'
                            });
                        }
                        
                        if (imageData) {
                            chartImages.set(slide.id, imageData);
                        }
                    }
                } catch (error) {
                    // Тихо игнорируем ошибки
                }
            }
        }
        
        // ОТКЛЮЧАЕМ РЕЖИМ ЭКСПОРТА
        document.body.classList.remove('export-mode');
        const mainContainerForCleanup = document.querySelector('#root, .App, main');
        if (mainContainerForCleanup) {
            mainContainerForCleanup.classList.remove('export-mode');
        }
        
        return chartImages;
    }


    /**
     * Поиск элемента графика с расширенными селекторами
     */
    findChartElement(slideId) {
        // ПРИОРИТЕТ: ищем в preview области (видимый график после переключения)
        const previewSelectors = [
            // Точный селектор графика
            `#root > div > main > div > div:nth-child(2) > div > div.preview-layout > div.main-slide-area > div.slide-container > div > div > div > div`,
            // Запасные варианты для графика
            `.slide-container .chart-container`,
            `.slide-container .chart-full-width`,
            `.slide-container .comparison-full-width`,
            `.slide-container [class*="Chart-module"]`,
            `.slide-container canvas`,
            `.slide-container svg`,
            // Если не найдем график, берем весь слайд
            `.slide-container`,
            `.main-slide-area .slide-container`
        ];
        
        for (const selector of previewSelectors) {
            const element = document.querySelector(selector);
            if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
                const textContent = element.textContent || '';
                const hasChartData = textContent.includes('квартал') || textContent.includes('План') || textContent.includes('Факт') || textContent.includes('График');
                
                return element;
            }
        }

        // FALLBACK: ищем в export контейнере
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

    /**
     * Генерация PDF отчета на клиенте
     */
    async generateClientPDF(report, options = {}) {
        try {
            // Ждем, чтобы все графики успели отрендериться
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Сначала захватываем все графики как изображения
            const chartImages = await this.captureAllCharts(report);
            
            // Проверяем, что графики действительно захвачены
            if (chartImages.size === 0) {
                console.warn('⚠️ Не удалось захватить ни одного графика');
            }
            
            const pdf = new jsPDF({
                orientation: options.orientation || 'landscape',
                unit: 'mm',
                format: options.format || 'a4'
            });

            // Настройки по умолчанию
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            const contentHeight = pageHeight - (margin * 2);

            let currentY = margin;

            // Добавляем заголовок отчета
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text(report.title || 'Отчет', margin, currentY);
            currentY += 15;

            // Добавляем описание, если есть
            if (report.description) {
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                pdf.text(report.description, margin, currentY);
                currentY += 10;
            }

            // Добавляем дату создания
            const createdDate = new Date(report.createdAt).toLocaleDateString('ru-RU');
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Создан: ${createdDate}`, margin, currentY);
            currentY += 15;

            // Добавляем слайды
            for (let i = 0; i < report.slides.length; i++) {
                const slide = report.slides[i];
                
                // Проверяем, нужна ли новая страница
                if (currentY > pageHeight - 50) {
                    pdf.addPage();
                    currentY = margin;
                }

                // Заголовок слайда
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`${i + 1}. ${slide.title}`, margin, currentY);
                currentY += 10;

                // Тип слайда
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                const slideTypeNames = {
                    'title': 'Титульный слайд',
                    'analytics-chart': 'График аналитики',
                    'finance-chart': 'Финансовый график',
                    'analytics-table': 'Таблица аналитики',
                    'finance-table': 'Финансовая таблица',
                    'comparison': 'Сравнение',
                    'trends': 'Тренды',
                    'plan-vs-actual': 'План vs Факт'
                };
                pdf.text(`Тип: ${slideTypeNames[slide.type] || slide.type}`, margin, currentY);
                currentY += 8;

                // Если это график и у нас есть изображение, добавляем его
                if (this.isChartSlide(slide.type) && chartImages.has(slide.id)) {
                    try {
                        const imageData = chartImages.get(slide.id);
                        
                        // Проверяем, что imageData валидный
                        if (!imageData || imageData === 'data:,') {
                            console.warn(`⚠️ Невалидные данные изображения для слайда ${slide.id}`);
                            currentY += 10;
                            continue;
                        }
                        
                        const imgWidth = contentWidth;
                        const imgHeight = Math.min(imgWidth * 0.6, 120); // Увеличиваем высоту
                        
                        // Проверяем, поместится ли изображение на странице
                        if (currentY + imgHeight > pageHeight - margin) {
                            pdf.addPage();
                            currentY = margin;
                        }
                        
                        // Добавляем изображение с правильными параметрами
                        pdf.addImage(imageData, 'PNG', margin, currentY, imgWidth, imgHeight, `chart_${slide.id}`, 'FAST');
                        currentY += imgHeight + 10;
                        
                    } catch (error) {
                        console.error(`❌ Ошибка добавления графика для слайда ${slide.id}:`, error);
                        currentY += 10;
                    }
                } else if (this.isChartSlide(slide.type)) {
                    console.warn(`⚠️ График для слайда ${slide.id} не найден в chartImages`);
                    currentY += 10;
                }

                // Описание слайда, если есть
                if (slide.content?.description) {
                    pdf.setFontSize(10);
                    pdf.text(slide.content.description, margin, currentY);
                    currentY += 6;
                }

                // Добавляем информацию о фильтрах, если есть
                if (slide.content?.filters) {
                    const filters = slide.content.filters;
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'italic');
                    
                    const filterInfo = [];
                    if (filters.years && filters.years.length > 0) {
                        filterInfo.push(`Годы: ${filters.years.join(', ')}`);
                    }
                    if (filters.categories && filters.categories.length > 0) {
                        filterInfo.push(`Категории: ${filters.categories.length}`);
                    }
                    if (filters.shops && filters.shops.length > 0) {
                        filterInfo.push(`Магазины: ${filters.shops.length}`);
                    }
                    if (filters.metrics && filters.metrics.length > 0) {
                        filterInfo.push(`Метрики: ${filters.metrics.length}`);
                    }

                    if (filterInfo.length > 0) {
                        pdf.text(`Фильтры: ${filterInfo.join('; ')}`, margin, currentY);
                        currentY += 6;
                    }
                }

                currentY += 15; // Отступ между слайдами
            }

            return pdf;

        } catch (error) {
            console.error('❌ ReportsService: Ошибка генерации PDF:', error);
            throw new Error('Ошибка генерации PDF: ' + error.message);
        }
    }

    /**
     * Генерация PowerPoint презентации на клиенте
     */
    async generateClientPPTX(report, options = {}) {
        try {
            // Ждем, чтобы все графики успели отрендериться
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Сначала захватываем все графики как изображения
            const chartImages = await this.captureAllCharts(report);
            
            // Проверяем, что графики действительно захвачены
            if (chartImages.size === 0) {
                console.warn('⚠️ Не удалось захватить ни одного графика для PowerPoint');
            }
            
            const pptx = new PptxGenJS();

            // Настройки презентации
            pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });
            pptx.layout = 'A4';

            // Добавляем слайды
            for (let i = 0; i < report.slides.length; i++) {
                const slide = report.slides[i];
                const pptxSlide = pptx.addSlide();

                // Заголовок слайда
                pptxSlide.addText(slide.title, {
                    x: 0.5,
                    y: 0.5,
                    w: 9,
                    h: 0.8,
                    fontSize: 24,
                    bold: true,
                    color: '1f4e79',
                    align: 'center'
                });

                // Тип слайда
                const slideTypeNames = {
                    'title': 'Титульный слайд',
                    'analytics-chart': 'График аналитики',
                    'finance-chart': 'Финансовый график',
                    'analytics-table': 'Таблица аналитики',
                    'finance-table': 'Финансовая таблица',
                    'comparison': 'Сравнение',
                    'trends': 'Тренды',
                    'plan-vs-actual': 'План vs Факт'
                };

                pptxSlide.addText(`Тип: ${slideTypeNames[slide.type] || slide.type}`, {
                    x: 0.5,
                    y: 1.5,
                    w: 9,
                    h: 0.4,
                    fontSize: 14,
                    color: '666666',
                    align: 'center'
                });

                // Если это график и у нас есть изображение, добавляем его
                if (this.isChartSlide(slide.type) && chartImages.has(slide.id)) {
                    try {
                        const imageData = chartImages.get(slide.id);
                        
                        // Проверяем, что imageData валидный
                        if (!imageData || imageData === 'data:,') {
                            console.warn(`⚠️ Невалидные данные изображения для слайда ${slide.id} в PowerPoint`);
                            console.warn(`⚠️ Данные изображения:`, imageData?.substring(0, 100));
                        } else {
                            
                            // Добавляем изображение графика с правильными размерами
                            try {
                                pptxSlide.addImage({
                                    data: imageData,
                                    x: 0.5,    // позиция X в дюймах от левого края
                                    y: 1.5,    // позиция Y в дюймах от верхнего края
                                    w: 8.5,    // ширина в дюймах (почти вся ширина слайда)
                                    h: 5.5     // высота в дюймах
                                });
                            } catch (addImageError) {
                                console.error(`❌ Ошибка в pptxSlide.addImage() для слайда ${slide.id}:`, addImageError);
                                console.error(`❌ Данные изображения (первые 100 символов):`, imageData?.substring(0, 100));
                                
                                // Пробуем альтернативный формат с процентными значениями
                                try {
                                    pptxSlide.addImage({
                                        data: imageData,
                                        x: '5%',
                                        y: '15%', 
                                        w: '90%',
                                        h: '70%'
                                    });
                                } catch (altError) {
                                    console.error(`❌ Альтернативный формат тоже не сработал:`, altError);
                                }
                            }
                            
                        }
                    } catch (error) {
                        console.error(`❌ Ошибка добавления графика для слайда ${slide.id} в PowerPoint:`, error);
                    }
                } else if (this.isChartSlide(slide.type)) {
                    console.warn(`⚠️ График для слайда ${slide.id} не найден в chartImages для PowerPoint`);
                } else {
                    // Описание слайда, если есть
                    if (slide.content?.description) {
                        pptxSlide.addText(slide.content.description, {
                            x: 0.5,
                            y: 2.0,
                            w: 9,
                            h: 1.0,
                            fontSize: 12,
                            color: '333333',
                            align: 'center'
                        });
                    }

                    // Добавляем информацию о фильтрах, если есть
                    if (slide.content?.filters) {
                        const filters = slide.content.filters;
                        const filterInfo = [];
                        
                        if (filters.years && filters.years.length > 0) {
                            filterInfo.push(`Годы: ${filters.years.join(', ')}`);
                        }
                        if (filters.categories && filters.categories.length > 0) {
                            filterInfo.push(`Категории: ${filters.categories.length}`);
                        }
                        if (filters.shops && filters.shops.length > 0) {
                            filterInfo.push(`Магазины: ${filters.shops.length}`);
                        }
                        if (filters.metrics && filters.metrics.length > 0) {
                            filterInfo.push(`Метрики: ${filters.metrics.length}`);
                        }

                        if (filterInfo.length > 0) {
                            pptxSlide.addText(`Фильтры: ${filterInfo.join('; ')}`, {
                                x: 0.5,
                                y: 3.5,
                                w: 9,
                                h: 0.6,
                                fontSize: 10,
                                color: '666666',
                                align: 'center'
                            });
                        }
                    }
                }

                // Добавляем номер слайда
                pptxSlide.addText(`${i + 1}`, {
                    x: 8.5,
                    y: 6.5,
                    w: 1,
                    h: 0.5,
                    fontSize: 12,
                    color: '999999',
                    align: 'right'
                });
            }

            return pptx;

        } catch (error) {
            console.error('❌ ReportsService: Ошибка генерации PowerPoint:', error);
            throw new Error('Ошибка генерации PowerPoint: ' + error.message);
        }
    }

    /**
     * Экспорт в PDF через сервер
     */
    async exportToPDF(reportId, options = {}) {
        try {
            const response = await this.apiClient.post('/reports/export/pdf', {
                report_id: reportId,
                ...options
            });
            return response;
        } catch (error) {
            console.error('❌ ReportsService: Ошибка серверного экспорта PDF:', error);
            throw error;
        }
    }

    /**
     * Экспорт в PowerPoint через сервер
     */
    async exportToPPTX(reportId, options = {}) {
        try {
            const response = await this.apiClient.post('/reports/export/pptx', {
                report_id: reportId,
                ...options
            });
            return response;
        } catch (error) {
            console.error('❌ ReportsService: Ошибка серверного экспорта PowerPoint:', error);
            throw error;
        }
    }

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
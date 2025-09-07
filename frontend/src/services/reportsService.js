import { ApiClient } from './http/ApiClient';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas';
import * as htmlToImage from 'html-to-image';
import slideRenderer from './slideRenderer';

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
            console.log('🔄 ReportsService: Запрос метрик по URL:', url);
            console.log('🔄 ReportsService: categoryId:', categoryId);
            
            const response = await this.apiClient.get(url);
            console.log('✅ ReportsService: Ответ сервера:', response);
            console.log('📊 ReportsService: Тип ответа:', typeof response);
            console.log('📊 ReportsService: Это массив?', Array.isArray(response));
            
            // API возвращает массив напрямую, а не в поле data
            const metrics = Array.isArray(response) ? response : (response.data || []);
            console.log('📊 ReportsService: Данные метрик:', metrics);
            console.log('📊 ReportsService: Количество метрик:', metrics.length);
            
            if (metrics.length > 0) {
                console.log('📊 ReportsService: Первая метрика:', metrics[0]);
            }
            
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
            
            console.log('🔄 ReportsService: Запрос финансовых данных с фильтрами:', filters);
            const response = await this.apiClient.get(`/finance/metrics/with-data?${params}`);
            console.log('✅ ReportsService: Ответ финансовых данных:', response);
            
            // Преобразуем данные в формат для графиков
            const chartData = this.prepareFinanceChartData(response, filters);
            console.log('📊 ReportsService: Подготовленные данные для графика:', chartData);
            
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
        console.log('🔍 ReportsService: prepareFinanceChartData вызвана с данными:', rawData);
        console.log('🔍 ReportsService: Фильтры:', filters);
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
            console.log('⚠️ ReportsService: Нет данных для подготовки графика');
            return [];
        }

        const periodType = filters.periodType || 'quarters';
        const chartData = [];

        console.log('🔍 ReportsService: Обрабатываем', rawData.length, 'метрик');
        console.log('🔍 ReportsService: Тип периода:', periodType);

        rawData.forEach((metric, index) => {
            console.log(`🔍 ReportsService: Обрабатываем метрику ${index + 1}:`, metric);
            
            const periods = metric.periods;
            console.log(`🔍 ReportsService: Периоды для метрики ${index + 1}:`, periods);
            
            if (!periods) {
                console.log(`⚠️ ReportsService: Нет периодов для метрики ${index + 1}`);
                return;
            }

            let periodData = [];
            
            if (periodType === 'quarters' && periods.quarters) {
                console.log(`🔍 ReportsService: Обрабатываем кварталы для метрики ${index + 1}:`, periods.quarters);
                periodData = Object.entries(periods.quarters)
                    .filter(([quarter, data]) => data && (data.actual !== null || data.plan !== null))
                    .map(([quarter, data]) => ({
                        label: `Q${quarter}`,
                        plan: data.plan || 0,
                        fact: data.actual || 0,
                        deviation: (data.actual || 0) - (data.plan || 0)
                    }));
            } else if (periodType === 'months' && periods.months) {
                console.log(`🔍 ReportsService: Обрабатываем месяцы для метрики ${index + 1}:`, periods.months);
                periodData = Object.entries(periods.months)
                    .filter(([month, data]) => data && (data.actual !== null || data.plan !== null))
                    .map(([month, data]) => ({
                        label: this.getMonthName(parseInt(month)),
                        plan: data.plan || 0,
                        fact: data.actual || 0,
                        deviation: (data.actual || 0) - (data.plan || 0)
                    }));
            } else if (periodType === 'year' && periods.year) {
                console.log(`🔍 ReportsService: Обрабатываем год для метрики ${index + 1}:`, periods.year);
                periodData = [{
                    label: 'Год',
                    plan: periods.year.plan || 0,
                    fact: periods.year.actual || 0,
                    deviation: (periods.year.actual || 0) - (periods.year.plan || 0)
                }];
            } else {
                console.log(`⚠️ ReportsService: Не найдены данные для типа периода ${periodType} в метрике ${index + 1}`);
                console.log(`🔍 ReportsService: Доступные ключи периодов:`, Object.keys(periods || {}));
                
                // Попробуем использовать кварталы по умолчанию, если они есть
                if (periods.quarters) {
                    console.log(`🔄 ReportsService: Пробуем использовать кварталы по умолчанию`);
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

            console.log(`🔍 ReportsService: Подготовленные данные периода для метрики ${index + 1}:`, periodData);

            if (periodData.length > 0) {
                // Добавляем данные периода напрямую в chartData
                // Chart компонент ожидает плоский массив объектов с полями plan, fact, deviation
                console.log(`✅ ReportsService: Добавляем в график ${periodData.length} точек данных для метрики ${index + 1}`);
                chartData.push(...periodData);
            } else {
                console.log(`⚠️ ReportsService: Пропускаем метрику ${index + 1} - нет данных периода`);
            }
        });

        console.log('📊 ReportsService: Итоговые подготовленные данные графика:', chartData);
        console.log('📊 ReportsService: Количество точек данных:', chartData.length);
        
        // Если нет данных, создаем тестовые данные для демонстрации
        if (chartData.length === 0) {
            console.log('⚠️ ReportsService: Нет данных для графика, создаем тестовые данные');
            chartData.push(
                { label: 'Q1', plan: 100, fact: 120, deviation: 20 },
                { label: 'Q2', plan: 150, fact: 140, deviation: -10 },
                { label: 'Q3', plan: 200, fact: 180, deviation: -20 },
                { label: 'Q4', plan: 180, fact: 200, deviation: 20 }
            );
        }
        
        // Проверяем структуру данных перед возвратом
        if (chartData.length > 0) {
            console.log('📊 ReportsService: Первая точка данных:', chartData[0]);
            console.log('📊 ReportsService: Ключи первой точки:', Object.keys(chartData[0]));
        }
        
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
        
        console.log('🔍 ReportsService: getSelectedMetrics вызвана с фильтрами:', filters);
        console.log('🔍 ReportsService: Возвращаемые метрики:', metrics);
        
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

            console.log(`📸 Захватываем график с html-to-image, размеры: ${chartElement.offsetWidth}x${chartElement.offsetHeight}`);

            // Ждем, чтобы все анимации завершились
            await new Promise(resolve => setTimeout(resolve, 500));

            // Используем html-to-image для лучшей работы с SVG
            const dataURL = await htmlToImage.toPng(chartElement, {
                backgroundColor: options.backgroundColor || '#ffffff',
                pixelRatio: options.scale || 3,
                quality: 1.0,
                cacheBust: true,
                filter: (node) => {
                    // Игнорируем элементы, которые могут мешать захвату
                    return !node.classList?.contains('spinner-border') && 
                           !node.classList?.contains('loading') &&
                           !node.classList?.contains('tooltip') &&
                           !node.classList?.contains('popover');
                }
            });

            if (!dataURL || dataURL === 'data:,') {
                console.warn('Invalid data URL generated with html-to-image');
                return null;
            }

            console.log(`✅ График успешно захвачен с html-to-image, размер данных: ${dataURL.length} символов`);
            return dataURL;

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
            
            console.log(`Found ${svgElements.length} SVG elements and ${canvasElements.length} canvas elements`);
            
            // Если есть SVG элементы, пытаемся их обработать
            if (svgElements.length > 0) {
                console.log('Processing SVG elements for better capture...');
                
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

            console.log(`Chart captured successfully: ${canvas.width}x${canvas.height}`);
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
        
        console.log(`🔍 Начинаем захват графиков для отчета с ${report.slides.length} слайдами`);
        
        for (const slide of report.slides) {
            if (this.isChartSlide(slide.type)) {
                console.log(`📊 Обрабатываем слайд ${slide.id} типа ${slide.type}`);
                
                try {
                    // Ищем элемент графика по ID слайда
                    let chartElement = document.querySelector(`[data-slide-id="${slide.id}"] .chart-container`);
                    
                    // Если не нашли по основному селектору, пробуем альтернативные
                    if (!chartElement) {
                        console.log(`🔍 Основной селектор не сработал для слайда ${slide.id}, пробуем альтернативные`);
                        chartElement = document.querySelector(`[data-slide-id="${slide.id}"]`);
                        if (chartElement) {
                            console.log(`✅ Найден альтернативный элемент для слайда ${slide.id}`);
                        }
                    }
                    
                    if (chartElement) {
                        console.log(`✅ Найден элемент графика для слайда ${slide.id}, размеры: ${chartElement.offsetWidth}x${chartElement.offsetHeight}`);
                        
                        // Ждем, пока график полностью отрендерится
                        await this.waitForChartToRender(chartElement);
                        
                        // Дополнительная пауза для стабилизации
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Сначала пробуем html-to-image, затем fallback на html2canvas
                        let imageData = await this.captureChartAsImageWithHtmlToImage(chartElement, {
                            scale: 3, // Увеличиваем масштаб для лучшего качества
                            backgroundColor: '#ffffff'
                        });
                        
                        // Если html-to-image не сработал, пробуем html2canvas
                        if (!imageData) {
                            console.log(`🔄 html-to-image не сработал для слайда ${slide.id}, пробуем html2canvas`);
                            imageData = await this.captureChartAsImage(chartElement, {
                                scale: 3,
                                backgroundColor: '#ffffff'
                            });
                        }
                        
                        if (imageData) {
                            chartImages.set(slide.id, imageData);
                            console.log(`✅ График успешно захвачен для слайда ${slide.id}, размер данных: ${imageData.length} символов`);
                        } else {
                            console.warn(`⚠️ Не удалось захватить график для слайда ${slide.id}`);
                        }
                    } else {
                        console.warn(`❌ Элемент графика не найден для слайда ${slide.id}`);
                        // Попробуем найти альтернативный селектор
                        const altElement = document.querySelector(`[data-slide-id="${slide.id}"]`);
                        if (altElement) {
                            console.log(`🔍 Найден альтернативный элемент для слайда ${slide.id}:`, altElement);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Ошибка захвата графика для слайда ${slide.id}:`, error);
                }
            } else {
                console.log(`⏭️ Пропускаем слайд ${slide.id} типа ${slide.type} (не график)`);
            }
        }
        
        console.log(`📊 Захват завершен. Получено ${chartImages.size} изображений графиков`);
        return chartImages;
    }

    /**
     * Ожидание полного рендеринга графика
     */
    async waitForChartToRender(chartElement, maxWaitTime = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkChart = () => {
                // Проверяем, есть ли столбцы графика
                const bars = chartElement.querySelectorAll('.chart-bar, [class*="chartBar"], rect, circle, path');
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
                
                console.log(`Chart check: bars=${hasBars}, svg=${hasSvg}, canvas=${hasCanvas}, data=${hasData}, visible=${isVisible}, svgSize=${svgHasSize}`);
                
                // Дополнительная отладка для SVG элементов
                if (svgElements.length > 0) {
                    console.log(`SVG elements found: ${svgElements.length}`);
                    svgElements.forEach((svg, index) => {
                        console.log(`SVG ${index}: ${svg.offsetWidth}x${svg.offsetHeight}, viewBox: ${svg.getAttribute('viewBox')}`);
                    });
                }
                
                if ((hasBars || hasSvg || hasCanvas) && hasData && isVisible && svgHasSize) {
                    console.log('Chart is ready for capture');
                    resolve();
                } else if (Date.now() - startTime > maxWaitTime) {
                    console.warn('Chart render timeout, proceeding anyway');
                    resolve();
                } else {
                    // Ждем еще 200ms и проверяем снова
                    setTimeout(checkChart, 200);
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
            console.log('🔄 ReportsService: Генерация PDF для отчета:', report.title);
            
            // Используем новую логику рендеринга слайдов на сервере
            console.log('🎨 Рендерим слайды на сервере...');
            const chartImages = await slideRenderer.renderAllSlides(report, options.slideDataMap || new Map());
            console.log(`🎨 Отрендерено ${chartImages.size} слайдов на сервере`);
            
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
                        console.log(`📊 Обрабатываем график для слайда ${slide.id}, размер данных: ${imageData.length} символов`);
                        
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
                        
                        console.log(`📊 Успешно добавлен график для слайда ${slide.id} (${imgWidth}x${imgHeight})`);
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

            console.log('✅ ReportsService: PDF успешно сгенерирован');
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
            console.log('🔄 ReportsService: Генерация PowerPoint для отчета:', report.title);
            
            // Используем новую логику рендеринга слайдов на сервере
            console.log('🎨 Рендерим слайды на сервере для PowerPoint...');
            const chartImages = await slideRenderer.renderAllSlides(report, options.slideDataMap || new Map());
            console.log(`🎨 Отрендерено ${chartImages.size} слайдов на сервере`);
            
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
                        console.log(`📊 Обрабатываем график для слайда ${slide.id} в PowerPoint, размер данных: ${imageData.length} символов`);
                        
                        // Проверяем, что imageData валидный
                        if (!imageData || imageData === 'data:,') {
                            console.warn(`⚠️ Невалидные данные изображения для слайда ${slide.id} в PowerPoint`);
                        } else {
                            // Добавляем изображение графика с правильными размерами
                            pptxSlide.addImage({
                                data: imageData,
                                x: 0.5,
                                y: 2.0,
                                w: 9,
                                h: 5,
                                sizing: {
                                    type: 'contain',
                                    w: 9,
                                    h: 5
                                }
                            });
                            
                            console.log(`📊 Успешно добавлен график для слайда ${slide.id} в PowerPoint (9x5)`);
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

            console.log('✅ ReportsService: PowerPoint успешно сгенерирован');
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
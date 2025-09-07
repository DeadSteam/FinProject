/**
 * Сервис для рендеринга слайдов в изображения
 * Использует Puppeteer для серверного рендеринга
 */

class SlideRenderer {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    }

    /**
     * Рендерит все слайды отчета в изображения
     */
    async renderAllSlides(report, slideDataMap = new Map()) {
        console.log('🎨 SlideRenderer: Начинаем рендеринг слайдов на сервере');
        
        try {
            // Отправляем данные отчета на сервер для рендеринга
            const response = await fetch(`${this.baseUrl}/api/v1/reports/render-slides`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    report: report,
                    slideData: Array.from(slideDataMap.entries())
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`🎨 SlideRenderer: Получено ${result.images.length} изображений с сервера`);
            
            // Конвертируем результат в Map
            const chartImages = new Map();
            result.images.forEach((imageData, index) => {
                const slideId = report.slides[index]?.id;
                if (slideId) {
                    chartImages.set(slideId, imageData);
                }
            });

            return chartImages;

        } catch (error) {
            console.error('❌ SlideRenderer: Ошибка серверного рендеринга:', error);
            
            // Fallback: используем клиентский рендеринг
            console.log('🔄 SlideRenderer: Переключаемся на клиентский рендеринг');
            return await this.renderSlidesClientSide(report, slideDataMap);
        }
    }

    /**
     * Клиентский рендеринг как fallback
     */
    async renderSlidesClientSide(report, slideDataMap) {
        console.log('🎨 SlideRenderer: Клиентский рендеринг слайдов');
        
        const chartImages = new Map();
        
        for (const slide of report.slides) {
            if (this.isChartSlide(slide.type)) {
                try {
                    // Создаем временный контейнер для рендеринга
                    const tempContainer = this.createTempSlideContainer(slide, slideDataMap.get(slide.id));
                    
                    // Рендерим в изображение
                    const imageData = await this.renderSlideToImage(tempContainer);
                    
                    if (imageData) {
                        chartImages.set(slide.id, imageData);
                        console.log(`✅ SlideRenderer: Слайд ${slide.id} отрендерен`);
                    }
                    
                    // Удаляем временный контейнер
                    document.body.removeChild(tempContainer);
                    
                } catch (error) {
                    console.error(`❌ SlideRenderer: Ошибка рендеринга слайда ${slide.id}:`, error);
                }
            }
        }
        
        return chartImages;
    }

    /**
     * Создает временный контейнер для рендеринга слайда
     */
    createTempSlideContainer(slide, slideData) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            left: -9999px;
            top: -9999px;
            width: 800px;
            height: 600px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        // Рендерим содержимое слайда
        container.innerHTML = this.renderSlideContent(slide, slideData);
        
        document.body.appendChild(container);
        return container;
    }

    /**
     * Рендерит содержимое слайда
     */
    renderSlideContent(slide, slideData) {
        const { type, title, content } = slide;
        
        let slideContent = `
            <div class="slide-header" style="margin-bottom: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 24px; color: #333;">${title}</h2>
            </div>
        `;

        if (type === 'finance-chart' || type === 'analytics-chart') {
            slideContent += this.renderChartSlide(slide, slideData);
        } else if (type === 'comparison') {
            slideContent += this.renderComparisonSlide(slide, slideData);
        } else if (type === 'table') {
            slideContent += this.renderTableSlide(slide, slideData);
        }

        return slideContent;
    }

    /**
     * Рендерит график
     */
    renderChartSlide(slide, slideData) {
        if (!slideData?.chartData) {
            return '<div>Нет данных для отображения</div>';
        }

        const { chartData, selectedMetrics } = slideData;
        
        // Создаем простой SVG график
        const maxValue = Math.max(...chartData.map(d => Math.max(...selectedMetrics.map(m => d[m] || 0))));
        const width = 700;
        const height = 400;
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        let svg = `<svg width="${width}" height="${height}" style="border: 1px solid #eee;">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2E7D32;stop-opacity:1" />
                </linearGradient>
            </defs>`;

        // Оси
        svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;
        svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="2"/>`;

        // Данные
        chartData.forEach((data, index) => {
            const x = padding + (index * chartWidth) / chartData.length + chartWidth / (2 * chartData.length);
            
            selectedMetrics.forEach((metric, metricIndex) => {
                const value = data[metric] || 0;
                const barHeight = (value / maxValue) * chartHeight;
                const y = height - padding - barHeight;
                const barWidth = chartWidth / (chartData.length * selectedMetrics.length) * 0.8;
                const barX = x - barWidth / 2 + (metricIndex * barWidth);
                
                svg += `<rect x="${barX}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#grad1)" opacity="0.8"/>`;
            });
        });

        // Подписи
        chartData.forEach((data, index) => {
            const x = padding + (index * chartWidth) / chartData.length + chartWidth / (2 * chartData.length);
            svg += `<text x="${x}" y="${height - padding + 20}" text-anchor="middle" font-size="12" fill="#666">${data.label || `Период ${index + 1}`}</text>`;
        });

        svg += '</svg>';
        return svg;
    }

    /**
     * Рендерит слайд сравнения
     */
    renderComparisonSlide(slide, slideData) {
        if (!slideData?.chartData) {
            return '<div>Нет данных для отображения</div>';
        }

        const { chartData } = slideData;
        
        let table = '<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">';
        table += '<thead><tr style="background: #f5f5f5;">';
        table += '<th style="border: 1px solid #ddd; padding: 10px;">Показатель</th>';
        
        // Заголовки колонок
        const columns = Object.keys(chartData[0] || {}).filter(key => key !== 'label');
        columns.forEach(col => {
            table += `<th style="border: 1px solid #ddd; padding: 10px;">${col}</th>`;
        });
        table += '</tr></thead><tbody>';

        // Данные
        chartData.forEach(row => {
            table += '<tr>';
            table += `<td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">${row.label}</td>`;
            columns.forEach(col => {
                table += `<td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${row[col] || 0}</td>`;
            });
            table += '</tr>';
        });

        table += '</tbody></table>';
        return table;
    }

    /**
     * Рендерит табличный слайд
     */
    renderTableSlide(slide, slideData) {
        return this.renderComparisonSlide(slide, slideData);
    }

    /**
     * Конвертирует контейнер в изображение
     */
    async renderSlideToImage(container) {
        try {
            // Ждем рендеринга
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Используем html2canvas для захвата
            const canvas = await html2canvas(container, {
                width: 800,
                height: 600,
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });
            
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('❌ SlideRenderer: Ошибка конвертации в изображение:', error);
            return null;
        }
    }

    /**
     * Проверяет, является ли слайд графиком
     */
    isChartSlide(slideType) {
        return ['analytics-chart', 'finance-chart', 'trends', 'plan-vs-actual', 'comparison'].includes(slideType);
    }
}

export default new SlideRenderer();

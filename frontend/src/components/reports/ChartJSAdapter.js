import React, { useRef, useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale
);

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Адаптер для Chart.js в системе отчетов.
 * Преобразует данные из формата приложения в формат Chart.js.
 */
const ChartJSAdapter = ({ 
    data, 
    type = 'line', 
    options = {}, 
    selectedMetrics = ['value'], 
    title
}) => {
    const chartRef = useRef(null);
    const [chartInstance, setChartInstance] = useState(null);

    // Фиксированные цвета для графиков
    const colors = {
        primary: '#4f46e5',
        secondary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6'
    };

    // Преобразование данных для Chart.js
    const transformDataForChartJS = () => {
        // Если данные уже в формате Chart.js, используем их напрямую
        if (data && data.labels && data.datasets) {
            if (dev) {
        
            }
            return data;
        }

        // Если данные в старом формате (массив объектов), преобразуем их
        if (!data || !Array.isArray(data)) {
            if (dev) {
        
            }
            return { labels: [], datasets: [] };
        }

        // Извлекаем лейблы
        const labels = data.map(item => item.label || item.period || item.name || 'Без названия');

        // Создаем датасеты для каждой выбранной метрики
        const datasets = [];
        const colorKeys = Object.keys(colors);

        selectedMetrics.forEach((metric, index) => {
            const colorKey = colorKeys[index % colorKeys.length];
            const color = colors[colorKey];

            // Извлекаем значения для метрики
            const values = data.map(item => {
                const value = item[metric];
                if (typeof value === 'string') {
                    // Обрабатываем процентные значения
                    if (value.includes('%')) {
                        return parseFloat(value.replace('%', '')) || 0;
                    }
                    // Обрабатываем числовые строки
                    return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
                }
                return parseFloat(value) || 0;
            });

            // Определяем название метрики
            const metricNames = {
                plan: 'План',
                actual: 'Факт',
                fact: 'Факт',
                value: 'Значение',
                deviation: 'Отклонение',
                percentage: '% выполнения',
                income: 'Доходы',
                expense: 'Расходы',
                profit: 'Прибыль',
                revenue: 'Выручка'
            };

            const label = metricNames[metric] || metric;

            // Настройки датасета в зависимости от типа графика
            const dataset = {
                label,
                data: values,
                backgroundColor: type === 'pie' 
                    ? values.map((_, i) => colors[colorKeys[i % colorKeys.length]])
                    : color + '80', // Полупрозрачный для столбцов
                borderColor: color,
                borderWidth: 2
            };

            // Дополнительные настройки для линейных графиков
            if (type === 'line' || type === 'area') {
                dataset.fill = type === 'area';
                dataset.tension = 0.4; // Плавные кривые
                dataset.pointBackgroundColor = color;
                dataset.pointBorderColor = '#ffffff';
                dataset.pointBorderWidth = 2;
                dataset.pointRadius = 4;
                dataset.pointHoverRadius = 6;
            }

            // Дополнительные настройки для столбчатых графиков
            if (type === 'bar') {
                dataset.borderRadius = 4;
                dataset.borderSkipped = false;
            }

            datasets.push(dataset);
        });

        return { labels, datasets };
    };

    // Настройки Chart.js
    const getChartOptions = () => {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        color: '#1f2937'
                    }
                },
                title: {
                    display: !!title,
                    text: title,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    color: 'var(--text-primary)',
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: '#374151',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#d1d5db',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            
                            // Форматирование значений
                            if (label.includes('%')) {
                                return `${label}: ${value.toFixed(1)}%`;
                            } else if (value >= 1000) {
                                return `${label}: ${value.toLocaleString('ru-RU')}`;
                            } else {
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            },
            scales: {},
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };

        // Настройки осей для графиков с осями
        if (type !== 'pie' && type !== 'radar') {
            baseOptions.scales = {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            if (value >= 1000) {
                                return value.toLocaleString('ru-RU');
                            }
                            return value;
                        }
                    }
                }
            };
        }

        // Специальные настройки для радарных графиков
        if (type === 'radar') {
            baseOptions.scales = {
                r: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        color: '#6b7280',
                        font: {
                            size: 11
                        }
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 10
                        }
                    }
                }
            };
        }

        // Объединяем с пользовательскими настройками
        return {
            ...baseOptions,
            ...options,
            plugins: {
                ...baseOptions.plugins,
                ...options.plugins
            },
            scales: {
                ...baseOptions.scales,
                ...options.scales
            }
        };
    };

    // Обновление графика при изменении данных
    useEffect(() => {
        if (chartInstance) {
            const newData = transformDataForChartJS();
            chartInstance.data = newData;
            chartInstance.options = getChartOptions();
            chartInstance.update('active');
        }
    }, [data, selectedMetrics, type, options, title, showLegend, colorScheme]);

    // Обработчик создания экземпляра графика
    const handleChartRef = (chart) => {
        setChartInstance(chart);
    };

    const chartData = transformDataForChartJS();
    const chartOptions = getChartOptions();

    // Проверяем, есть ли данные для отображения
    const hasData = chartData && chartData.labels && chartData.labels.length > 0 && 
                   chartData.datasets && chartData.datasets.length > 0;

    if (!hasData) {
        if (dev) {
    
        }
        return (
            <div className="chart-placeholder">
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '300px',
                    color: '#6b7280',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    <div>Нет данных для отображения</div>
                </div>
            </div>
        );
    }



    // Защита от ошибок рендеринга
    try {
        return (
            <div className="chartjs-adapter" style={{ position: 'relative', height: '400px', background: 'white', border: '1px solid #ddd' }}>
                <Chart
                    ref={handleChartRef}
                    type={type}
                    data={chartData}
                    options={chartOptions}
                    onError={(error) => {
                        console.error('❌ Ошибка рендеринга графика:', error);
                    }}
                />
            </div>
        );
    } catch (error) {
        console.error('❌ Критическая ошибка в ChartJSAdapter:', error);
        return (
            <div className="chart-error" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '400px',
                color: '#ef4444',
                flexDirection: 'column',
                gap: '1rem',
                background: 'white',
                border: '1px solid #ddd'
            }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div>Ошибка отображения графика</div>
                <small style={{ color: '#6b7280' }}>{error.message}</small>
            </div>
        );
    }
};

export default ChartJSAdapter;

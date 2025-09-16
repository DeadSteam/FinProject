/**
 * Компонент-обертка AG Charts для финансового проекта
 * Обеспечивает совместимость с существующим API
 */

import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { AgCharts } from 'ag-charts-community';
import { getCurrentTheme, chartTemplates, resolveCSSVariables, createCustomTooltip } from './config/agChartsConfig';
import { fromFinanceData, createSeriesConfig } from './utils/chartDataTransformers';

// Глобальная обработка ошибок ResizeObserver
if (typeof window !== 'undefined') {
  const resizeObserverErrorHandler = (e) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
      // Игнорируем эту ошибку, так как она не критична
      e.stopImmediatePropagation();
    }
  };
  
  window.addEventListener('error', resizeObserverErrorHandler);
  window.addEventListener('unhandledrejection', resizeObserverErrorHandler);
}

// Безопасное определение development режима
const isDevelopment = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
  }
  return false;
};

const dev = isDevelopment();

/**
 * Основной компонент-обертка AG Charts
 */
const AGChartWrapper = forwardRef(({ 
  data, 
  title, 
  isFiltering = false, 
  type = 'bar',
  selectedMetrics = ['plan', 'actual'], 
  disableAnimations = false, 
  noMargins = false,
  className = '',
  style = {},
  onChartReady,
  onDataClick,
  ...props 
}, ref) => {
  const chartRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentData, setCurrentData] = useState(data);
  const [forceRender, setForceRender] = useState(0);
  const [chartOptions, setChartOptions] = useState(null);

  // Определяем, является ли график длинным (нужна горизонтальная прокрутка)
  const isLongChart = useMemo(() => {
    if (!currentData || !Array.isArray(currentData)) return false;
    // Для столбчатых графиков считаем длинными графики с более чем 8 элементов
    // Для линейных графиков - более чем 10 элементов
    const threshold = type === 'bar' ? 8 : 10;
    return currentData.length > threshold;
  }, [currentData, type]);

  // Функция для принудительного перерендера графика
  const forceRerender = useCallback(() => {
    setForceRender(prev => prev + 1);
  }, []);

  // Отслеживаем изменения данных для плавного перехода
  useEffect(() => {
    if (!data) return;
    
    // Если данные изменились и мы не в процессе фильтрации
    if (!isFiltering && JSON.stringify(data) !== JSON.stringify(currentData)) {
      setCurrentData(data);
    }
  }, [data, isFiltering, currentData]);

  // Обработчик изменения размера окна с debounce
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Очищаем предыдущий таймер
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // Устанавливаем новый таймер с задержкой
      resizeTimeout = setTimeout(() => {
        if (Array.isArray(currentData) && currentData.length > 0) {
          // Перерисовываем график при изменении размера
          forceRerender();
        }
      }, 150); // Увеличиваем задержку для предотвращения частых обновлений
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [currentData, type, selectedMetrics, forceRerender]);

  // Преобразование данных и создание серий — используем централизованные утилиты
  const transformData = useCallback((chartData) => {
    return fromFinanceData(Array.isArray(chartData) ? chartData : [], selectedMetrics);
  }, [selectedMetrics]);

  const createSeries = useCallback((data) => {
    const series = createSeriesConfig(selectedMetrics, type).map((cfg) => ({
      ...chartTemplates[type === 'line' ? 'line' : type === 'area' ? 'area' : 'bar'],
      ...cfg,
      highlight: { enabled: false },
      tooltip: {
        enabled: true,
        renderer: (params) => {
          const { datum, xKey, yKey } = params;
          if (!datum || !xKey || !yKey) return '';
          const category = datum[xKey];
          let value = datum[yKey];
          const displayName = getMetricDisplayName(yKey);
          if (yKey === 'percentage' && datum.percentage_original !== undefined) {
            value = datum.percentage_original;
          }
          let formattedValue;
          if (typeof value === 'number') {
            formattedValue = yKey === 'percentage' ? `${value.toFixed(1)}%` : value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
          } else {
            formattedValue = value;
          }
          return {
            title: category,
            data: [{ label: displayName, value: formattedValue }]
          };
        }
      }
    }));
    return series;
  }, [type, selectedMetrics]);

  // Получение отображаемого имени метрики
  const getMetricDisplayName = (metric) => {
    const names = {
      plan: 'План',
      actual: 'Факт',
      fact: 'Факт',
      deviation: 'Отклонение',
      percentage: 'Процент'
    };
    return names[metric] || metric;
  };

  // Получение цвета метрики (соответствует Chart.module.css)
  const getMetricColor = (metric, index) => {
    const metricColors = {
      plan: '#a5b4fc',      // var(--primary-light) - для плана (светлый)
      actual: '#4f46e5',    // var(--primary) - для факта (темный)
      fact: '#4f46e5',      // var(--primary) - для факта (темный)
      deviation: '#dc3545', // красный для отклонений (как в CSS)
      percentage: '#28a745' // зеленый для процентов (как в CSS)
    };
    return metricColors[metric] || '#4f46e5';
  };

  // Получение цвета обводки метрики
  const getMetricStrokeColor = (metric, index) => {
    const strokeColors = {
      plan: '#a5b4fc',      // var(--primary-light)
      actual: '#4f46e5',    // var(--primary)
      fact: '#4f46e5',      // var(--primary)
      deviation: '#dc3545', // красный для отклонений
      percentage: '#28a745' // зеленый для процентов
    };
    return strokeColors[metric] || '#4f46e5';
  };

  // Функция для расчета максимального значения данных
  const calculateMaxValue = useCallback((data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return 100;
    
    let max = 0;
    let hasPercentage = false;
    
    data.forEach(item => {
      selectedMetrics.forEach(metric => {
        const value = parseFloat(item[metric]);
        if (!isNaN(value)) {
          // Если это процент, масштабируем его относительно максимального значения других метрик
          if (metric === 'percentage') {
            hasPercentage = true;
            // Для процентов используем их реальное значение (0-100+)
            if (value > max) {
              max = value;
            }
          } else {
            // Для других метрик используем их абсолютные значения
            if (value > max) {
              max = value;
            }
          }
        }
      });
    });
    
    // Если есть проценты, масштабируем их к максимальному значению других метрик
    if (hasPercentage && selectedMetrics.some(m => m !== 'percentage')) {
      const nonPercentageMax = Math.max(...data.map(item => 
        Math.max(...selectedMetrics.filter(m => m !== 'percentage').map(metric => 
          parseFloat(item[metric]) || 0
        ))
      ));
      
      if (nonPercentageMax > 0) {
        // Масштабируем проценты к диапазону других метрик
        const percentageMax = Math.max(...data.map(item => 
          parseFloat(item.percentage) || 0
        ));
        
        if (percentageMax > 0) {
          // Находим коэффициент масштабирования
          const scaleFactor = nonPercentageMax / 100; // 100% = максимальное значение других метрик
          max = Math.max(max, percentageMax * scaleFactor);
        }
      }
    }
    
    // Добавляем небольшой отступ (5%) вместо стандартного (10%)
    return max * 1.05;
  }, [selectedMetrics]);

  // Создание опций графика
  const createChartOptions = useCallback((data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        data: [],
        series: [],
        title: { text: title || 'График' }
      };
    }

    const transformedData = transformData(data);
    const series = createSeries(transformedData);
    const maxValue = calculateMaxValue(data);

    const options = {
      data: transformedData,
      series,
      title: {
        text: title || 'График',
        fontSize: 18,
        fontWeight: 700,
        color: '#1e293b', // textPrimary
        fontFamily: 'Rimma Sans, Segoe UI, system-ui, sans-serif'
      },
      theme: getCurrentTheme(),
      padding: noMargins ? { top: 10, right: 10, bottom: 10, left: 10 } : { top: 30, right: 30, bottom: 50, left: 50 }, // увеличиваем отступы для лучшего отображения
      background: {
        fill: 'transparent'
      },
      // hover/interaction выключаем через series.highlight выше
      // Настройки осей
      axes: [
        {
          type: 'category',
          position: 'bottom',
          label: {
            color: '#64748b', // textSecondary
            fontSize: 12
          },
          line: {
            stroke: '#e2e8f0', // border
            width: 1
          },
          tick: {
            stroke: '#e2e8f0', // border
            size: 4
          }
        },
        {
          type: 'number',
          position: 'left',
          label: {
            color: '#64748b', // textSecondary
            fontSize: 12
          },
          line: {
            stroke: '#e2e8f0', // border
            width: 1
          },
          tick: {
            stroke: '#e2e8f0', // border
            size: 4
          },
          // Автоматическое масштабирование под данные
          nice: false,             // Отключаем автоматическое округление
          min: 0,                  // Фиксируем минимум на 0
          max: maxValue            // Используем рассчитанное максимальное значение
        }
      ],
      // Настройки легенды
      legend: {
        enabled: true,
        position: 'top',
        item: {
          label: {
            color: '#1e293b', // textPrimary
            fontSize: 12
          }
        }
      },
      // Настройки подсказок - режим single для отображения только данных конкретной серии
      tooltip: {
        enabled: true,
        mode: 'single',  // Показывать tooltip только для одной серии
        range: 'exact'   // Показывать tooltip только при точном наведении
      },
      // Отключение анимаций если нужно
      ...(disableAnimations && {
        animation: {
          enabled: false
        }
      })
    };

    // Добавляем обработчики событий
    if (onDataClick) {
      options.listeners = {
        seriesNodeClick: (event) => {
          onDataClick(event);
        }
      };
    }

    return options;
  }, [type, selectedMetrics, title, noMargins, disableAnimations, onDataClick, transformData, createSeries, calculateMaxValue]);

  // Обновление опций графика при изменении данных
  useEffect(() => {
    if (!currentData || !Array.isArray(currentData) || currentData.length === 0) {
      setChartOptions({
        data: [],
        series: [],
        title: { text: title || 'График' }
      });
      return;
    }

    const options = createChartOptions(currentData);
    setChartOptions(options);
  }, [currentData, createChartOptions, title]);

  // Создание и обновление графика с защитой от ResizeObserver
  useEffect(() => {
    if (!chartOptions || !chartRef.current) return;

    // Используем requestAnimationFrame для более стабильного обновления
    const updateChart = () => {
      try {
        if (chartRef.current.chartInstance) {
          chartRef.current.chartInstance.update(chartOptions);
        } else {
          const chartInstance = AgCharts.create({
            container: chartRef.current,
            ...chartOptions
          });
          chartRef.current.chartInstance = chartInstance;
          // Помечаем контейнер для внешнего поиска и экспорта
          try {
            chartRef.current.setAttribute('data-ag-chart', 'true');
          } catch {}
          chartRef.current.__agChartInstance = chartInstance;
          
          // Вызываем callback если передан
          if (onChartReady) {
            setTimeout(() => {
              onChartReady(chartInstance);
            }, 100);
          }
        }
      } catch (error) {
        // Игнорируем ошибки ResizeObserver
        if (error.message && error.message.includes('ResizeObserver')) {
          console.warn('ResizeObserver error ignored:', error.message);
          return;
        }
        throw error;
      }
    };

    // Используем requestAnimationFrame для отложенного обновления
    const rafId = requestAnimationFrame(updateChart);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [chartOptions, onChartReady]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }
    };
  }, []);

  // Обработчик изменения темы
  useEffect(() => {
    const handleThemeChange = () => {
      if (chartOptions) {
        const newOptions = {
        ...chartOptions,
          theme: getCurrentTheme()
        };
        setChartOptions(newOptions);
      }
    };

    // Слушаем изменения data-theme атрибута
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, [chartOptions]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Метод для принудительного обновления
    forceUpdate: forceRerender,
    // Метод для получения экземпляра графика
    getChart: () => chartRef.current?.chartInstance,
    // Метод для экспорта графика
    exportChart: async (format = 'svg', options = {}) => {
      if (chartRef.current?.chartInstance) {
        return await chartRef.current.chartInstance.export(format, options);
      }
      return null;
    },
    // Метод для обновления данных
    updateData: (newData) => {
      setCurrentData(newData);
    }
  }), [forceRerender]);

  // Стили для контейнера
  const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '400px', // увеличиваем минимальную высоту для лучшего отображения
    ...(isLongChart && {
      overflowX: 'auto',
      overflowY: 'hidden'
    }),
    ...style
  };

  // Классы для контейнера
  const containerClasses = [
    'ag-chart-container',
    isLongChart ? 'ag-chart-long' : '',
    isTransitioning ? 'ag-chart-transitioning' : '',
    className
  ].filter(Boolean).join(' ');

  if (dev) {
    console.log('AGChartWrapper render:', {
      type,
      selectedMetrics,
      dataLength: currentData?.length,
      isLongChart,
      chartOptions: chartOptions ? 'configured' : 'not configured'
    });
  }

  return (
    <div
      ref={chartRef}
      className={containerClasses}
      style={containerStyle}
      {...props}
    >
      {/* Контейнер для AG Charts */}
    </div>
  );
});

AGChartWrapper.displayName = 'AGChartWrapper';

export default AGChartWrapper;

/**
 * Хук для работы с данными графиков
 * Централизует логику подготовки и обработки данных
 */

import { useMemo, useCallback } from 'react';
import { prepareChartData, calculateStatistics, toSafeNumber } from '../utils/chartDataUtils';

/**
 * Хук для работы с данными графиков
 */
export const useChartData = ({
  analyticsData,
  filters = {},
  groupBy = 'categories',
  selectedMetrics = ['plan', 'actual'],
  isLoading = false
}) => {
  // Определяем тип группировки на основе фильтров
  const actualGroupBy = useMemo(() => {
    const pt = filters?.periodType;
    if (pt === 'months') return 'monthly';
    if (pt === 'quarters') return 'quarterly';
    return groupBy;
  }, [filters?.periodType, groupBy]);

  // Подготавливаем данные для графика
  const chartData = useMemo(() => {
    if (!analyticsData) return null;
    return prepareChartData(analyticsData, actualGroupBy, filters);
  }, [analyticsData, actualGroupBy, filters]);

  // Вычисляем статистику
  const statistics = useMemo(() => {
    if (!chartData) return null;
    
    // Для месячных/квартальных данных chartData - это объект, а не массив
    if (actualGroupBy === 'monthly' || actualGroupBy === 'quarterly') {
      return null; // Статистика не нужна для этих режимов
    }
    
    // Для обычных данных chartData - это массив
    if (Array.isArray(chartData)) {
      return calculateStatistics(chartData);
    }
    
    return null;
  }, [chartData, actualGroupBy]);

  // Проверяем, есть ли данные для отображения
  const hasData = useMemo(() => {
    if (!chartData) return false;
    
    if (actualGroupBy === 'monthly' || actualGroupBy === 'quarterly') {
      // Для месячных/квартальных данных проверяем, есть ли хотя бы одна метрика с данными
      return Object.values(chartData).some(series => 
        Array.isArray(series) && series.length > 0
      );
    }
    
    // Для обычных данных проверяем массив
    return Array.isArray(chartData) && chartData.length > 0;
  }, [chartData, actualGroupBy]);

  // Проверяем, выбраны ли метрики
  const hasSelectedMetrics = useMemo(() => {
    return selectedMetrics && selectedMetrics.length > 0;
  }, [selectedMetrics]);

  return {
    chartData,
    statistics,
    actualGroupBy,
    hasData,
    hasSelectedMetrics,
    isLoading
  };
};

/**
 * Хук для работы с данными трендов
 */
export const useTrendsData = ({
  analyticsData,
  filters = {},
  trendType = 'absolute',
  smoothing = false
}) => {
  // Определяем тип данных на основе фильтров
  const timeframe = useMemo(() => {
    const pt = filters.periodType;
    if (pt === 'months') return 'monthly';
    if (pt === 'quarters') return 'quarterly';
    return 'yearly';
  }, [filters.periodType]);

  // Функция сглаживания данных
  const applySmoothing = useCallback((data) => {
    if (data.length < 3) return data;
    
    const smoothed = [...data];
    
    // Простое сглаживание: каждый элемент = среднее с соседними
    for (let i = 1; i < data.length - 1; i++) {
      const prev = toSafeNumber(data[i - 1].actual || 0);
      const current = toSafeNumber(data[i].actual || 0);
      const next = toSafeNumber(data[i + 1].actual || 0);
      
      smoothed[i] = {
        ...smoothed[i],
        actual: (prev + current + next) / 3
      };
    }
    
    return smoothed;
  }, []);

  // Применяем анализ трендов
  const applyTrendAnalysis = useCallback((data, type, smoothing) => {
    if (!data || data.length === 0) return data;
    
    let processedData = data;
    
    switch (type) {
      case 'absolute':
        processedData = data;
        break;
        
      case 'percentage':
        // Конвертируем в проценты от максимального значения
        const maxValue = Math.max(...data.map(item => toSafeNumber(item.actual || 0)));
        processedData = data.map(item => ({
          ...item,
          actual: maxValue > 0 ? ((toSafeNumber(item.actual || 0) / maxValue) * 100) : 0,
          plan: maxValue > 0 ? ((toSafeNumber(item.plan || 0) / maxValue) * 100) : 0
        }));
        break;
        
      case 'moving_average':
        // Скользящее среднее за 3 периода
        processedData = data.map((item, index) => {
          const window = 3;
          const start = Math.max(0, index - window + 1);
          const end = index + 1;
          const values = data.slice(start, end).map(d => toSafeNumber(d.actual || 0));
          const average = values.reduce((sum, val) => sum + val, 0) / values.length;
          
          return {
            ...item,
            actual: average,
            plan: item.plan || 0
          };
        });
        break;
        
      default:
        processedData = data;
    }
    
    // Применяем сглаживание если включено
    if (smoothing && processedData.length > 2) {
      processedData = applySmoothing(processedData);
    }
    
    return processedData;
  }, [applySmoothing]);

  // Подготавливаем данные для графика трендов
  const chartData = useMemo(() => {
    if (!analyticsData?.trends) return [];
    
    // Для трендов используем специальную логику
    const trendsData = analyticsData.trends[timeframe];
    if (!trendsData) return [];
    
    // Преобразуем данные трендов в формат для графиков
    const data = [];
    
    if (timeframe === 'yearly') {
      // Для годовых данных
      const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
      years.forEach(year => {
        const yearData = trendsData[year];
        data.push({
          label: year,
          actual: toSafeNumber(yearData.actual || 0),
          plan: toSafeNumber(yearData.plan || 0),
          deviation: toSafeNumber(yearData.deviation || 0),
          percentage: toSafeNumber(yearData.percentage || 0)
        });
      });
    } else if (timeframe === 'quarterly') {
      // Для квартальных данных
      const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
      const quarterNames = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
      const quarterKeys = ['Q1', 'Q2', 'Q3', 'Q4'];
      
      years.forEach(year => {
        const yearData = trendsData[year];
        quarterKeys.forEach((quarterKey, index) => {
          const quarterData = yearData[quarterKey];
          if (quarterData) {
            data.push({
              label: `${year} ${quarterNames[index]}`,
              actual: toSafeNumber(quarterData.actual || 0),
              plan: toSafeNumber(quarterData.plan || 0),
              deviation: toSafeNumber(quarterData.deviation || 0),
              percentage: toSafeNumber(quarterData.percentage || 0)
            });
          }
        });
      });
    } else if (timeframe === 'monthly') {
      // Для месячных данных
      const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthNamesRu = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
                          'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
      
      years.forEach(year => {
        const yearData = trendsData[year];
        monthNames.forEach((month, index) => {
          const monthData = yearData[month];
          if (monthData) {
            data.push({
              label: `${monthNamesRu[index]} ${year}`,
              actual: toSafeNumber(monthData.actual || 0),
              plan: toSafeNumber(monthData.plan || 0),
              deviation: toSafeNumber(monthData.deviation || 0),
              percentage: toSafeNumber(monthData.percentage || 0)
            });
          }
        });
      });
    }
    
    return applyTrendAnalysis(data, trendType, smoothing);
  }, [analyticsData, timeframe, filters, trendType, smoothing, applyTrendAnalysis]);

  // Получаем статистику трендов с сервера
  const trendStats = useMemo(() => {
    if (!analyticsData?.trendStats) return null;
    // Фиксируем на годовых сводках, чтобы карточки не пересчитывались при смене табов
    const mode = 'yearly';
    return analyticsData.trendStats[mode] || null;
  }, [analyticsData]);

  return {
    chartData,
    trendStats,
    timeframe
  };
};

export default {
  useChartData,
  useTrendsData
};

/**
 * Утилиты для преобразования данных для AG Charts
 */

export const fromFinanceData = (data, selectedMetrics = ['plan', 'actual']) => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  const nonPercentageMetrics = selectedMetrics.filter(m => m !== 'percentage');
  let maxNonPercentageValue = 0;
  if (nonPercentageMetrics.length > 0) {
    data.forEach(item => {
      nonPercentageMetrics.forEach(metric => {
        const value = parseFloat(item[metric]);
        if (!isNaN(value) && value > maxNonPercentageValue) {
          maxNonPercentageValue = value;
        }
      });
    });
  }

  return data.map((item, index) => {
    const dataPoint = { category: item.category || item.label || item.period || `Item ${index + 1}`, index };
    selectedMetrics.forEach(metric => {
      if (item[metric] !== undefined) {
        const metricValue = parseFloat(item[metric]);
        const safe = Number.isFinite(metricValue) ? metricValue : 0;
        if (metric === 'percentage' && maxNonPercentageValue > 0) {
          dataPoint[metric] = (safe / 100) * maxNonPercentageValue;
          dataPoint.percentage_original = safe;
        } else {
          dataPoint[metric] = safe;
        }
      }
    });
    if (item.plan !== undefined) dataPoint.plan = parseFloat(item.plan) || 0;
    if (item.actual !== undefined) dataPoint.actual = parseFloat(item.actual) || 0;
    if (item.fact !== undefined) dataPoint.fact = parseFloat(item.fact) || 0;
    if (item.deviation !== undefined) dataPoint.deviation = parseFloat(item.deviation) || 0;
    if (item.percentage !== undefined) {
      const percentageValue = parseFloat(item.percentage) || 0;
      if (maxNonPercentageValue > 0) {
        dataPoint.percentage = (percentageValue / 100) * maxNonPercentageValue;
        dataPoint.percentage_original = percentageValue;
      } else {
        dataPoint.percentage = percentageValue;
        dataPoint.percentage_original = percentageValue;
      }
    }
    return dataPoint;
  });
};

export const createSeriesConfig = (selectedMetrics = ['plan', 'actual'], type = 'bar') => {
  // Базовые цвета для известных метрик (план/факт и т.п.)
  const metricColors = { plan: '#a5b4fc', actual: '#4f46e5', fact: '#4f46e5', deviation: '#dc3545', percentage: '#28a745' };
  const metricNames = { plan: 'План', actual: 'Факт', fact: 'Факт', deviation: 'Отклонение', percentage: 'Процент' };

  // Чтение CSS переменных палитры из globals.css (fallback'и на случай отсутствия DOM)
  const getCssVar = (name, fallback) => {
    try {
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
      }
    } catch (_) {}
    return fallback;
  };

  const dynamicPalette = [
    getCssVar('--primary', '#4f46e5'),
    getCssVar('--primary-light', '#a5b4fc'),
    getCssVar('--secondary-grafic', '#978ab5'),
    getCssVar('--thirdy-grafic', '#b0cbd2'),
    // вместо оранжевого используем светлый фирменный
    getCssVar('--success', '#10b981'),
    getCssVar('--info', '#3b82f6'),
    // предупреждения также заменяем на светлый фирменный

    getCssVar('--error', '#ef4444')
  ].filter(Boolean);

  return selectedMetrics.map((metric, index) => {
    const color = metricColors[metric] || dynamicPalette[index % dynamicPalette.length] || '#4f46e5';
    return ({
    yKey: metric,
    yName: metricNames[metric] || metric,
    fill: color,
    stroke: color,
    strokeWidth: type === 'line' || type === 'area' ? 2 : 0,
    marker: type === 'line' || type === 'area' ? { shape: 'circle', size: 4, strokeWidth: 2, fill: color, stroke: color } : undefined,
    fillOpacity: type === 'area' ? 0.3 : 1,
    cornerRadius: type === 'bar' ? 4 : 0
    });
  });
};

// prepareExportData и вспомогательные функции для Chart.js удалены как неиспользуемые

export const formatValue = (value, metric = '') => {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  if (metric === 'percentage') return `${value.toFixed(1)}%`;
  if (value >= 1000) {
    return value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return value.toString();
};

export const calculateStatistics = (data, metric) => {
  if (!data || !Array.isArray(data) || data.length === 0) return { min: 0, max: 0, avg: 0, sum: 0 };
  const values = data.map(item => parseFloat(item[metric]) || 0).filter(value => !isNaN(value));
  if (values.length === 0) return { min: 0, max: 0, avg: 0, sum: 0 };
  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, avg, sum };
};

export default { fromFinanceData, createSeriesConfig, formatValue, calculateStatistics };


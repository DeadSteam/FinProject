/**
 * Конфигурация AG Charts для финансового проекта (унифицированная)
 * Перенесено из src/config/agChartsConfig.js, удалены дубли и устаревшие опции
 */

import { AgCharts } from 'ag-charts-community';

// Палитра проекта
const colors = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primaryLight: '#a5b4fc',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
  error: '#ef4444',
  secondary: '#6b7280',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textWhite: '#ffffff',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8f9fa',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderRadius: 6,
  borderRadiusSm: 4,
  borderRadiusLg: 8,
  borderRadiusXs: 3,
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
};

const getCSSVariable = (variableName) => {
  if (typeof window === 'undefined' || !document) {
    return colors[variableName.replace('--', '')] || '';
  }
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim() || colors[variableName.replace('--', '')] || '';
};

const resolveCSSVariable = (value) => {
  if (typeof value === 'string' && value.startsWith('var(')) {
    const variableName = value.replace('var(', '').replace(')', '');
    return getCSSVariable(variableName);
  }
  return value;
};

export const resolveCSSVariables = (obj) => {
  if (typeof obj === 'string') return resolveCSSVariable(obj);
  if (Array.isArray(obj)) return obj.map(resolveCSSVariables);
  if (obj && typeof obj === 'object') {
    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveCSSVariables(value);
    }
    return resolved;
  }
  return obj;
};

export const lightTheme = {
  baseTheme: 'ag-default',
  palette: {
    fills: [colors.primary, colors.primaryLight, colors.success, colors.warning, colors.info, colors.error, colors.secondary, colors.accent],
    strokes: [colors.primaryDark, colors.accent, colors.success, colors.warning, colors.info, colors.error, colors.secondary, colors.textPrimary]
  },
  params: {
    foregroundColor: colors.textPrimary,
    backgroundColor: colors.bgPrimary,
    accentColor: colors.primary,
    fontFamily: [{ googleFont: 'Rimma Sans' }, 'Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    fontSize: 14
  },
  overrides: {
    common: {
      title: { fontSize: 18, fontWeight: 700, color: colors.textPrimary, fontFamily: 'Rimma Sans, Segoe UI, system-ui, sans-serif' },
      subtitle: { fontSize: 14, fontWeight: 400, color: colors.textSecondary, fontFamily: 'Rimma Sans, Segoe UI, system-ui, sans-serif' },
      padding: { top: 20, right: 20, bottom: 20, left: 20 }
    }
  }
};

export const darkTheme = {
  baseTheme: 'ag-default-dark',
  palette: {
    fills: [colors.primary, colors.accent, colors.success, colors.warning, colors.info, colors.error, colors.secondary, colors.primaryLight],
    strokes: [colors.primaryDark, colors.accent, colors.success, colors.warning, colors.info, colors.error, colors.secondary, colors.textPrimary]
  },
  params: {
    foregroundColor: colors.textPrimary,
    backgroundColor: colors.bgPrimary,
    accentColor: colors.primary,
    fontFamily: [{ googleFont: 'Rimma Sans' }, 'Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    fontSize: 14
  },
  overrides: { ...lightTheme.overrides }
};

export const getCurrentTheme = () => {
  if (typeof window === 'undefined' || !document) {
    return resolveCSSVariables(lightTheme);
  }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  return resolveCSSVariables(theme);
};

export const exportConfig = {
  svg: { width: 800, height: 600, scale: 2, backgroundColor: 'transparent' },
  png: { width: 800, height: 600, scale: 2, backgroundColor: 'white' }
};

// Базовые шаблоны для типов графиков (без устаревших highlightStyle/interactions)
export const chartTemplates = {
  bar: { type: 'bar', xKey: 'category', yKey: 'value', strokeWidth: 0, cornerRadius: 4 },
  line: { type: 'line', xKey: 'category', yKey: 'value', strokeWidth: 2, marker: { shape: 'circle', size: 4, strokeWidth: 2 } },
  area: { type: 'area', xKey: 'category', yKey: 'value', strokeWidth: 2, fillOpacity: 0.3, marker: { shape: 'circle', size: 4, strokeWidth: 2 } },
  pie: { type: 'pie', angleKey: 'value', calloutLabelKey: 'label', calloutLabel: { enabled: true }, sectorLabel: { enabled: true } },
  combination: { type: 'combination', xKey: 'category', series: [] }
};

export const calculateDataRange = (data, yKeys) => {
  if (!data || !Array.isArray(data) || data.length === 0) return { min: 0, max: 100 };
  let min = Infinity, max = -Infinity;
  data.forEach(item => {
    yKeys.forEach(key => {
      const value = parseFloat(item[key]);
      if (!isNaN(value)) { min = Math.min(min, value); max = Math.max(max, value); }
    });
  });
  if (min === Infinity || max === -Infinity || min === max) {
    // Для случаев когда все значения одинаковые или отсутствуют
    if (max === 0) {
        return { min: -10, max: 10 }; // Небольшой диапазон для нулевых значений
    }
    return { min: 0, max: max > 0 ? max * 1.1 : 100 };
}
  const padding = (max - min) * 0.1;
  return { min: Math.max(0, min - padding), max: max + padding };
};

export const createChart = (container, options) => {
  const theme = getCurrentTheme();
  const chartOptions = { container, theme, ...resolveCSSVariables(options), autoSize: true, resizable: true, width: undefined, height: undefined };
  try { return AgCharts.create(chartOptions); } catch (error) {
    if (error.message && error.message.includes('ResizeObserver')) { console.warn('ResizeObserver error ignored during chart creation:', error.message); return null; }
    throw error;
  }
};

export const updateChartTheme = (chart) => {
  const theme = getCurrentTheme();
  chart.update({ theme });
};

export const exportChart = async (chart, format = 'svg', options = {}) => {
  const exportOptions = { ...exportConfig[format], ...options };
  return await chart.export(format, exportOptions);
};

export const createCustomTooltip = () => ({
  enabled: true,
  mode: 'single',
  range: 'exact',
});

export default {
  lightTheme,
  darkTheme,
  getCurrentTheme,
  exportConfig,
  chartTemplates,
  createChart,
  updateChartTheme,
  exportChart,
  createCustomTooltip,
  calculateDataRange,
  resolveCSSVariables
};



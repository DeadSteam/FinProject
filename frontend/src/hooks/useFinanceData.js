import { useState, useEffect, useCallback } from 'react';

import { useNotifications } from './index.js';

/**
 * useFinanceData – отвечает за загрузку метрик, периодов и категории.
 * Принимает сервисы и фильтры, возвращает данные + методы перезагрузки.
 */
export const useFinanceData = ({
  analyticsService,
  metricService,
  searchParams,
  selectedYear,
  selectedShop,
}) => {
  const { showError } = useNotifications();

  const [metrics, setMetrics] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);

  /** Генерация периодов на основе года */
  const generatePeriods = useCallback((yearInt) => {
    const setLocal = [];
    setLocal.push({ id: `year-${yearInt}`, year: yearInt, quarter: null, month: null });
    for (let q = 1; q <= 4; q++) {
      setLocal.push({ id: `quarter-${yearInt}-${q}`, year: yearInt, quarter: q, month: null });
    }
    for (let m = 1; m <= 12; m++) {
      const q = Math.ceil(m / 3);
      setLocal.push({ id: `month-${yearInt}-${m}`, year: yearInt, quarter: q, month: m });
    }
    setPeriods(setLocal);
  }, []);

  /** Загрузка метрик */
  const loadMetricsData = useCallback(async (isFiltering = false) => {
    try {
      if (isFiltering) setFiltering(true); else setLoading(true);
      const categoryId = searchParams.get('category');
      const shopId = searchParams.get('shop') || selectedShop;
      const year = searchParams.get('year') || selectedYear;
      if (!categoryId || !shopId || shopId === 'all') {
        setMetrics([]);
        setCategoryName('Финансовый отчёт');
        setActiveMetric(null);
        return;
      }
      const resp = await analyticsService.getDetailedCategoryMetrics(categoryId, shopId, year);
      if (resp && resp.metrics?.length) {
        const processed = resp.metrics.map(m => ({
          id: m.metric_id,
          name: m.metric_name,
          unit: m.unit,
          periods_value: m.periods_value,
        }));
        setMetrics(processed);
        setCategoryName(resp.category_name || 'Финансовый отчёт');
        generatePeriods(parseInt(year));
        setActiveMetric(prev => {
          if (prev) {
            const updated = processed.find(mm => mm.id === prev.id);
            return updated || processed[0];
          }
          return processed[0];
        });
      } else {
        setMetrics([]);
        setCategoryName('Финансовый отчёт');
        setActiveMetric(null);
      }
    } catch (err) {
      showError('Ошибка загрузки', `Ошибка при загрузке метрик: ${err.message}`);
    } finally {
      setFiltering(false);
      setLoading(false);
    }
  }, [analyticsService, searchParams, selectedShop, selectedYear, generatePeriods, showError]);

  // Initial load when hook mounts or filters change
  useEffect(() => {
    loadMetricsData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  return {
    metrics,
    periods,
    categoryName,
    loading,
    filtering,
    activeMetric,
    setActiveMetric,
    reload: loadMetricsData,
  };
}; 
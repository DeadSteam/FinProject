import { useMemo } from 'react';
import { calculateDeviationPercent, calculateVariance } from '../utils/deviationUtils.js';

/**
 * Хук формирования данных для таблицы план/факт
 * @param {Array} metrics - массив метрик с planValues/actualValues или periods_value
 * @param {Array} periods - массив периодов (старая структура)
 * @returns {Object} { tableData, totalData }
 */
export const useTableData = (metrics = [], periods = []) => {
  // Подготовка строки периода (квартал/месяц)
  const tableData = useMemo(() => {
    if (!metrics.length) return [];

    const monthNames = {
      1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
      7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
    };

    const quarterNames = { 1: 'I квартал', 2: 'II квартал', 3: 'III квартал', 4: 'IV квартал' };

    const rows = [];

    const hasPeriodsValue = metrics.some(m => m.periods_value);

    if (hasPeriodsValue) {
      // Новая структура данных
      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterRow = {
          id: `quarter-${quarter}`,
          period: quarterNames[quarter],
          periodId: `Q${quarter}`,
          isQuarter: true,
          quarter,
          className: 'quarter-row'
        };

        metrics.forEach(metric => {
          const qKey = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'][quarter - 1];
          const qData = metric.periods_value?.quarters?.[qKey] || {};

          const planVal = qData.plan || 0;
          const factVal = qData.actual || 0;
          const deviation = qData.procent || (factVal ? calculateDeviationPercent(planVal, factVal) : 0);
          const variance = qData.variance || calculateVariance(planVal, factVal);
          const actualValueId = qData.actual_value_id || null;
          const reason = qData.reason || '';

          quarterRow[`metric${metric.id}_plan`] = planVal;
          quarterRow[`metric${metric.id}_fact`] = factVal;
          quarterRow[`metric${metric.id}_deviation`] = deviation;
          quarterRow[`metric${metric.id}_variance`] = variance;
          quarterRow[`metric${metric.id}_actual_id`] = actualValueId;
          quarterRow[`metric${metric.id}_reason`] = reason;
        });

        rows.push(quarterRow);

        const qMonths = quarter === 1 ? [1, 2, 3] : quarter === 2 ? [4, 5, 6] : quarter === 3 ? [7, 8, 9] : [10, 11, 12];
        qMonths.forEach(month => {
          const monthRow = {
            id: `month-${month}`,
            period: monthNames[month],
            periodId: `M${month}`,
            isQuarter: false,
            month,
            className: 'month-row'
          };

          metrics.forEach(metric => {
            const mKey = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'][month - 1];
            const mData = metric.periods_value?.months?.[mKey] || {};

            const planVal = mData.plan || 0;
            const factVal = mData.actual || 0;
            const deviation = mData.procent || (factVal ? calculateDeviationPercent(planVal, factVal) : 0);
            const variance = mData.variance || calculateVariance(planVal, factVal);
            const actualValueId = mData.actual_value_id || null;
            const reason = mData.reason || '';

            monthRow[`metric${metric.id}_plan`] = planVal;
            monthRow[`metric${metric.id}_fact`] = factVal;
            monthRow[`metric${metric.id}_deviation`] = deviation;
            monthRow[`metric${metric.id}_variance`] = variance;
            monthRow[`metric${metric.id}_actual_id`] = actualValueId;
            monthRow[`metric${metric.id}_reason`] = reason;
          });

          rows.push(monthRow);
        });
      }
    } else if (periods.length) {
      // Старая структура данных
      const uniqueMonths = new Map();
      periods.filter(p => p.month !== null).forEach(p => {
        if (!uniqueMonths.has(p.month)) uniqueMonths.set(p.month, p);
      });
      const monthPeriods = Array.from(uniqueMonths.values()).sort((a, b) => a.month - b.month);
      const quarterPeriods = periods.filter(p => p.quarter !== null && p.month === null).sort((a,b)=>a.quarter-b.quarter);

      const quarterMonths = {
        1: monthPeriods.filter(p => p.month >= 1 && p.month <= 3),
        2: monthPeriods.filter(p => p.month >= 4 && p.month <= 6),
        3: monthPeriods.filter(p => p.month >= 7 && p.month <= 9),
        4: monthPeriods.filter(p => p.month >= 10 && p.month <= 12)
      };

      for (let quarter = 1; quarter <= 4; quarter++) {
        const qPeriod = quarterPeriods.find(p => p.quarter === quarter);
        if (!qPeriod) continue;

        const quarterRow = {
          id: `quarter-${quarter}`,
          period: quarterNames[quarter],
          periodId: qPeriod.id,
          isQuarter: true,
          quarter,
          className: 'quarter-row'
        };

        metrics.forEach(metric => {
          const planValue = metric.planValues?.find(pl => pl.period_id === qPeriod.id);
          const planVal = planValue ? parseFloat(planValue.value) : 0;

          const qActual = metric.actualValues?.find(av => av.period_id === qPeriod.id);
          let factVal = 0;
          let actualValueId = null;
          let reason = '';
          
          if (qActual) {
            factVal = parseFloat(qActual.value);
            actualValueId = qActual.id;
            reason = qActual.reason || '';
          } else {
            const monthIds = quarterMonths[quarter].map(m => m.id);
            const mFacts = metric.actualValues?.filter(av => monthIds.includes(av.period_id)) || [];
            factVal = mFacts.reduce((s, av) => s + parseFloat(av.value), 0);
          }

          const deviation = calculateDeviationPercent(planVal, factVal);
          const variance = calculateVariance(planVal, factVal);

          quarterRow[`metric${metric.id}_plan`] = planVal;
          quarterRow[`metric${metric.id}_fact`] = factVal;
          quarterRow[`metric${metric.id}_deviation`] = deviation;
          quarterRow[`metric${metric.id}_variance`] = variance;
          quarterRow[`metric${metric.id}_actual_id`] = actualValueId;
          quarterRow[`metric${metric.id}_reason`] = reason;
        });

        rows.push(quarterRow);

        // Months rows
        quarterMonths[quarter].forEach(mp => {
          const monthRow = {
            id: `month-${mp.month}`,
            period: monthNames[mp.month],
            periodId: mp.id,
            isQuarter: false,
            month: mp.month,
            className: 'month-row'
          };

          metrics.forEach(metric => {
            const planValue = metric.planValues?.find(pl => pl.period_id === mp.id);
            const planVal = planValue ? parseFloat(planValue.value) : 0;
            const actualValue = metric.actualValues?.find(av => av.period_id === mp.id);
            const factVal = actualValue ? parseFloat(actualValue.value) : 0;
            const actualValueId = actualValue ? actualValue.id : null;
            const reason = actualValue ? actualValue.reason || '' : '';

            const deviation = calculateDeviationPercent(planVal, factVal);
            const variance = calculateVariance(planVal, factVal);

            monthRow[`metric${metric.id}_plan`] = planVal;
            monthRow[`metric${metric.id}_fact`] = factVal;
            monthRow[`metric${metric.id}_deviation`] = deviation;
            monthRow[`metric${metric.id}_variance`] = variance;
            monthRow[`metric${metric.id}_actual_id`] = actualValueId;
            monthRow[`metric${metric.id}_reason`] = reason;
          });

          rows.push(monthRow);
        });
      }
    }

    return rows;
  }, [metrics, periods]);

  const totalData = useMemo(() => {
    if (!tableData.length || !metrics.length) return null;
    const totalRow = {
      id: 'total',
      period: 'Итого:',
      isTotal: true,
      className: 'total-row'
    };

    metrics.forEach(metric => {
      const quarterRows = tableData.filter(r => r.isQuarter);
      const totalPlan = quarterRows.reduce((s, r) => s + (r[`metric${metric.id}_plan`] || 0), 0);
      const totalFact = quarterRows.reduce((s, r) => s + (r[`metric${metric.id}_fact`] || 0), 0);
      const totalDeviation = calculateDeviationPercent(totalPlan, totalFact);
      const totalVariance = calculateVariance(totalPlan, totalFact);

      totalRow[`metric${metric.id}_plan`] = totalPlan;
      totalRow[`metric${metric.id}_fact`] = totalFact;
      totalRow[`metric${metric.id}_deviation`] = totalDeviation;
      totalRow[`metric${metric.id}_variance`] = totalVariance;
    });

    return totalRow;
  }, [tableData, metrics]);

  return { tableData, totalData };
}; 
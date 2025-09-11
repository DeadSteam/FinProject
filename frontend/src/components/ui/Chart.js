 import React, {useEffect, useRef, useState, useCallback} from 'react';

import styles from '@styles/components/Chart.module.css';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

const Chart = React.memo(({ data, title, isFiltering = false, type = 'bar', selectedMetrics = ['plan', 'actual'], disableAnimations = false, noMargins = false }) => {
  const chartRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentData, setCurrentData] = useState(data);
  const [forceRender, setForceRender] = useState(0);

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

  // Обработчик изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      if (currentData && currentData.length > 0) {
        // Перерисовываем график при изменении размера
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.innerHTML = '';
            forceRerender();
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentData, type, selectedMetrics, forceRerender]);

  // Основной useEffect для рендеринга графика
  useEffect(() => {
    if (!currentData || currentData.length === 0) {
      return;
    }

    // Находим максимальное значение для нормализации высоты с учетом выбранных метрик
    const getAllMetricValues = (item) => {
      const values = [];
      
      // Для стандартных метрик (используем серверные значения)
      if (selectedMetrics.includes('plan')) {
        const planValue = item.plan || 0;
        values.push(planValue);
      }
      if (selectedMetrics.includes('actual') || selectedMetrics.includes('fact')) {
        const factValue = item.actual || item.fact || 0;
        values.push(factValue);
      }
      if (selectedMetrics.includes('deviation')) {
        const deviationValue = item.deviation || 0;
        values.push(deviationValue);
      }
      if (selectedMetrics.includes('percentage')) {
        const percentageValue = item.percentage || 0;
        values.push(percentageValue);
      }
      
      // Для годовых/динамических метрик (например: "2023", "2024") учитываем модуль
      selectedMetrics.forEach(metric => {
        if (item[metric] !== undefined) {
          const metricValue = parseFloat(item[metric]);
          const safe = Number.isFinite(metricValue) ? metricValue : 0;
          values.push(Math.abs(safe));
        }
      });
      
      return values;
    };
    
    const maxValue = Math.max(
      ...currentData.flatMap(item => getAllMetricValues(item)),
      1 // Минимум 1, чтобы избежать деления на 0
    );
    

    // Подготавливаем данные для отображения с учетом выбранных метрик
    const chartData = currentData.map((item, index) => {
      // Высота контейнера для столбцов - 240px (из CSS)
      const maxHeight = 200; // Оставляем место для значений сверху
      
      const result = { ...item };
      
      if (selectedMetrics.includes('plan')) {
        const plan = parseFloat(item.plan) || 0;
        result.planHeight = Math.max(plan / maxValue * maxHeight, plan > 0 ? 20 : 0);
        result.plan = plan;
      }
      if (selectedMetrics.includes('actual') || selectedMetrics.includes('fact')) {
        const fact = parseFloat(item.actual || item.fact) || 0;
        result.factHeight = Math.max(fact / maxValue * maxHeight, fact > 0 ? 20 : 0);
        result.fact = fact;
      }
      if (selectedMetrics.includes('deviation')) {
        const deviation = parseFloat(item.deviation) || 0;
        result.deviationHeight = Math.max(Math.abs(deviation) / maxValue * maxHeight, Math.abs(deviation) > 0 ? 20 : 0);
        result.deviation = deviation;
      }
      if (selectedMetrics.includes('percentage')) {
        const percentage = parseFloat(item.percentage) || 0;
        result.percentageHeight = Math.max(percentage / maxValue * maxHeight, percentage > 0 ? 20 : 0);
        result.percentage = percentage;
      }

      return result;
    });

    // Очищаем контейнер с анимацией
    if (chartRef.current) {
      // Сначала анимируем исчезновение старых столбцов
      const existingBars = chartRef.current.querySelectorAll(`.${styles.chartBar}`);
      if (existingBars.length > 0) {
        existingBars.forEach(bar => {
          bar.style.height = '0px';
          bar.classList.add(styles.fadeOut);
        });
        
        // Ждем завершения анимации исчезновения
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.innerHTML = '';
            forceRerender();
          }
        }, 200);
        return;
      } else {
        renderChart();
      }
    }
    
    function renderChart() {
      if (!chartRef.current) return;
      
      // Очищаем контейнер
      chartRef.current.innerHTML = '';
      
      if (type === 'line') {
        renderLineChart();
      } else {
        renderBarChart();
      }
    }
    
    function renderBarChart() {
      if (!chartRef.current) return;
      
      const maxHeight = 200; // Определяем maxHeight в этой области видимости
      
      // Создаем контейнер для столбцов
      const barContainer = document.createElement('div');
      barContainer.className = styles.chartBarContainer;
      
      chartData.forEach((item) => {
        // Создаем группу для каждого периода
        const chartGroup = document.createElement('div');
        chartGroup.className = styles.chartGroup;
        
        // Создаем группу столбцов (план, факт, отклонение, проценты)
        const barGroup = document.createElement('div');
        barGroup.className = styles.chartBarGroup;
        
        // Создаем столбцы для всех выбранных метрик (подход Recharts - композиция)
        const metricsToRender = [
          { key: 'plan', height: item.planHeight, value: item.plan || 0, type: 'План', className: styles.chartBarPlan },
          { key: 'actual', height: item.factHeight, value: item.actual || item.fact || 0, type: 'Факт', className: styles.chartBarFact },
          { key: 'deviation', height: item.deviationHeight, value: item.deviation || 0, type: 'Отклонение', className: styles.chartBarDeviation },
          { 
            key: 'percentage', 
            height: item.percentageHeight, 
            value: (() => {
              const raw = item.percentage;
              const num = typeof raw === 'number' 
                ? raw 
                : parseFloat(String(raw ?? '0').replace(/\s/g, '').replace(',', '.'));
              const safe = Number.isFinite(num) ? num : 0;
              return `${safe.toFixed(1)}%`;
            })(), 
            type: '% выполнения', 
            className: styles.chartBarPercentage 
          }
        ];

        // Добавляем столбцы для годовых метрик (например: "2023", "2024")
        selectedMetrics.forEach((metric, yearIndex) => {
          if (item[metric] !== undefined && !['plan', 'actual', 'fact', 'deviation', 'percentage'].includes(metric)) {
            const valueRaw = parseFloat(item[metric]);
            const value = Number.isFinite(valueRaw) ? valueRaw : 0;
            const height = Math.max(Math.abs(value) / maxValue * maxHeight, Math.abs(value) > 0 ? 20 : 0);
            
            metricsToRender.push({
              key: metric,
              height: height,
              value: value,
              type: metric, // год как тип
              className: `${styles.chartBarCustom} chart-bar-year-${yearIndex}`,
              yearIndex: yearIndex // Сохраняем индекс для использования в цветах
            });
          }
        });

        metricsToRender.forEach((metric, metricIndex) => {
          if (selectedMetrics.includes(metric.key) || (metric.key === 'actual' && selectedMetrics.includes('fact'))) {
            const bar = document.createElement('div');
            bar.className = `${styles.chartBar} ${metric.className}`;
            
            // Специальная обработка для прогноза
            if (item.isForecast) {
              bar.className = `${styles.chartBar} ${styles.chartBarForecast}`;
            }
            
            bar.style.height = '0px';
            bar.style.width = '20px';
            bar.style.minWidth = '20px';
            bar.style.transition = 'height 0.6s ease-in-out';
            bar.dataset.targetHeight = `${metric.height}px`;
            bar.dataset.value = metric.value;
            bar.dataset.type = metric.type;
            bar.dataset.period = item.label || '';
            
            // Цвета для годовых столбцов из globals.css
            if (!['plan', 'actual', 'fact', 'deviation', 'percentage'].includes(metric.key)) {
              const yearColors = [
                'var(--primary)',      // #4f46e5
                'var(--success)',      // #10b981
                'var(--warning)',      // #f59e0b
                'var(--error)',        // #ef4444
                'var(--info)',         // #3b82f6
                'var(--secondary)',    // #64748b
                'var(--accent)'        // #f59e0b
              ];
              const colorIndex = metric.yearIndex % yearColors.length;
              bar.style.backgroundColor = yearColors[colorIndex];
            }
            
            // Tooltip при наведении
            bar.title = `${metric.type}: ${metric.value}`;
            
            barGroup.appendChild(bar);
          }
        });
        
        // Создаем подпись
        const label = document.createElement('div');
        label.className = item.isForecast ? `${styles.chartLabel} ${styles.chartLabelForecast}` : styles.chartLabel;
        
        // Добавляем атрибут data-period для стилизования
        label.setAttribute('data-period', item.label || '');
        
        // Улучшенное отображение для кварталов и месяцев
        if (item.label && (item.label.includes('Q') || item.label.includes('Январь') || item.label.includes('Февраль'))) {
          // Для кварталов показываем полное название
          if (item.label.includes('Q')) {
            const quarterMatch = item.label.match(/Q(\d+)/);
            if (quarterMatch) {
              label.textContent = `Q${quarterMatch[1]}`;
            } else {
              label.textContent = item.label;
            }
          } else {
            // Для месяцев показываем короткое название
            const monthMatch = item.label.match(/^(.{3})/);
            if (monthMatch) {
              label.textContent = monthMatch[1];
            } else {
              label.textContent = item.label;
            }
          }
        } else {
          label.textContent = item.label || '';
        }
        
        // Добавляем все в группу периода
        chartGroup.appendChild(barGroup);
        chartGroup.appendChild(label);
        
        // Добавляем группу в контейнер
        barContainer.appendChild(chartGroup);
      });
      
      chartRef.current.appendChild(barContainer);
      
      // Создаем tooltip
      const tooltip = document.createElement('div');
      tooltip.className = styles.tooltip;
      tooltip.style.display = 'none';
      chartRef.current.appendChild(tooltip);
      
      // Добавляем обработчики для tooltip
      const bars = chartRef.current.querySelectorAll(`.${styles.chartBar}`);
      bars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
          const raw = e.target.dataset.value;
          const {type} = e.target.dataset;
          const {period} = e.target.dataset;
          let formatted;
          if (typeof raw === 'string') {
            if (raw.includes('%')) {
              formatted = raw;
            } else {
              const num = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
              formatted = Number.isFinite(num) ? num.toLocaleString('ru-RU') : '0';
            }
          } else {
            const n = Number.isFinite(raw) ? raw : 0;
            formatted = n.toLocaleString('ru-RU');
          }
          
          tooltip.innerHTML = `
            <div class="${styles.tooltipPeriod}">${period}</div>
            <div class="${styles.tooltipValue}">${type}: ${formatted}</div>
          `;
          tooltip.style.display = 'block';
        });
        
        bar.addEventListener('mousemove', (e) => {
          const rect = chartRef.current.getBoundingClientRect();
          tooltip.style.left = `${e.clientX - rect.left + 10}px`;
          tooltip.style.top = `${e.clientY - rect.top - 40}px`;
        });
        
        bar.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
      
      // Добавляем анимацию через небольшую задержку (если не отключена)
      if (!disableAnimations) {
        setTimeout(() => {
          if (chartRef.current) {
            const bars = chartRef.current.querySelectorAll(`.${styles.chartBar}`);
            bars.forEach(bar => {
              // Устанавливаем целевую высоту для анимации
              bar.style.height = bar.dataset.targetHeight;
              bar.classList.add(styles.animateBar);
            });
          }
        }, 50);
      } else {
        // Без анимации - сразу устанавливаем финальную высоту
        if (chartRef.current) {
          const bars = chartRef.current.querySelectorAll(`.${styles.chartBar}`);
          bars.forEach(bar => {
            bar.style.height = bar.dataset.targetHeight;
            // Не добавляем класс animateBar
          });
        }
      }
    }
    
    function renderLineChart() {
      if (!chartRef.current) return;
      
      const containerWidth = chartRef.current.offsetWidth || 800;
      const width = Math.max(containerWidth - 40, containerWidth - 40); // Используем всю доступную ширину
      const height = 300;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.maxHeight = `${height}px`;
      const padding = 40;
      const chartWidth = width - 2 * padding;
      const chartHeight = height - 2 * padding;
      
      // Создаем линии для всех выбранных метрик (Recharts подход)
      const metricsToRender = [
        { key: 'plan', title: 'План', color: 'var(--primary-light)', getData: (item) => item.plan || 0 },
        { key: 'actual', title: 'Факт', color: 'var(--primary)', getData: (item) => item.actual || item.fact || 0 },
        { key: 'deviation', title: 'Отклонение', color: '#dc3545', getData: (item) => item.deviation || 0 },
        { key: 'percentage', title: '% выполнения', color: '#28a745', getData: (item) => item.percentage || 0 }
      ];

      // Добавляем динамические линии для годовых метрик (например: '2023', '2024')
      const dynamicYearKeys = (selectedMetrics || []).filter(key => !['plan', 'actual', 'fact', 'deviation', 'percentage'].includes(key));
      const yearColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
      dynamicYearKeys.forEach((yearKey, yearIndex) => {
        metricsToRender.push({
          key: yearKey,
          title: yearKey,
          color: yearColors[yearIndex % yearColors.length],
          getData: (item) => parseFloat(item[yearKey]) || 0
        });
      });

      // Создаем и добавляем линии для всех выбранных метрик
      metricsToRender.forEach(metric => {
        if ((selectedMetrics || []).includes(metric.key) || (metric.key === 'actual' && (selectedMetrics || []).includes('fact'))) {
          const points = [];
          chartData.forEach((item, index) => {
            const x = padding + (index / (chartData.length - 1)) * chartWidth;
            const value = metric.getData(item);
            const y = height - padding - (value / maxValue) * chartHeight;
            points.push(`${x},${y}`);
          });
          
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          line.setAttribute('d', `M ${points.join(' L ')}`);
          line.setAttribute('stroke', metric.color);
          line.setAttribute('stroke-width', '5');
          line.setAttribute('fill', 'none');
          line.setAttribute('class', styles.chartLine);
          svg.appendChild(line);
        }
      });
      
      // Добавляем точки для всех метрик и подписи годов
      chartData.forEach((item, index) => {
        const x = padding + (index / (chartData.length - 1)) * chartWidth;
        
        // Создаем точки для всех выбранных метрик
        metricsToRender.forEach(metric => {
          if ((selectedMetrics || []).includes(metric.key) || (metric.key === 'actual' && (selectedMetrics || []).includes('fact'))) {
            const value = metric.getData(item);
            const y = height - padding - (value / maxValue) * chartHeight;
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '5');
            circle.setAttribute('fill', metric.color);
            circle.setAttribute('stroke', metric.color);
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('class', styles.chartPoint);
            circle.dataset.value = value;
            circle.dataset.type = metric.title || metric.key;
            circle.dataset.period = item.label || '';
            circle.title = `${circle.dataset.type}: ${value}`;
            
            svg.appendChild(circle);
          }
        });
        
        // Добавляем подпись года снизу (только один раз)
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', height - 10); 
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', 'var(--text-secondary)');
        label.setAttribute('font-size', '12');
        label.setAttribute('data-period', item.label || '');
        label.textContent = item.label || '';
        svg.appendChild(label);
      });
      
      // Линии уже добавлены в цикле выше - убираем старый код
      chartRef.current.appendChild(svg);
      
      // Добавляем tooltip
      addTooltip(chartRef.current);
    }
    
    
    function addTooltip(container) {
      const tooltip = document.createElement('div');
      tooltip.className = styles.tooltip;
      tooltip.style.display = 'none';
      container.appendChild(tooltip);
      
      const elements = container.querySelectorAll(`.${styles.chartPoint}`);
      elements.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
          const value = parseInt(e.target.dataset.value).toLocaleString();
          const {type} = e.target.dataset;
          const {period} = e.target.dataset;
          
          tooltip.innerHTML = `
            <div class="${styles.tooltipPeriod}">${period}</div>
            <div class="${styles.tooltipValue}">${type}: ${value}</div>
          `;
          tooltip.style.display = 'block';
        });
        
        element.addEventListener('mousemove', (e) => {
          const rect = container.getBoundingClientRect();
          tooltip.style.left = `${e.clientX - rect.left + 10}px`;
          tooltip.style.top = `${e.clientY - rect.top - 40}px`;
        });
        
        element.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
                 });
       });
     }
    }, [currentData, type, forceRender]);

  // Отдельный useEffect для обработки фильтрации
  useEffect(() => {
    if (isFiltering) {
      setIsTransitioning(true);
      
      // Анимируем исчезновение текущих столбцов
      if (chartRef.current) {
        const existingBars = chartRef.current.querySelectorAll(`.${styles.chartBar}`);
        existingBars.forEach(bar => {
          bar.style.height = '0px';
          bar.classList.add(styles.fadeOut);
        });
      }
    } else if (isTransitioning) {
      setIsTransitioning(false);
      
      // Обновляем данные после завершения фильтрации
      if (JSON.stringify(data) !== JSON.stringify(currentData)) {
        setTimeout(() => {
          setCurrentData(data);
        }, 200); // Небольшая задержка для плавности
      }
    }
  }, [isFiltering, data, currentData, isTransitioning]);

  if (!currentData || currentData.length === 0) {
    return (
      <div className={`${styles.chartContainer} ${noMargins ? styles.noMargins : ''}`}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>{title || 'График'}</div>
          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendColorPlan}`}></div>
              <span>План</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendColorFact}`}></div>
              <span>Факт</span>
            </div>
                      {/* Динамическая легенда для других метрик (годы, категории и т.д.) */}
          {selectedMetrics.filter(metric => !['plan', 'actual', 'fact', 'deviation', 'percentage'].includes(metric)).map((metric, index) => {
            // Цвета для годовых столбцов из globals.css (соответствуют цветам столбцов)
            const yearColors = [
              'var(--primary)',      // #4f46e5
              'var(--success)',      // #10b981
              'var(--warning)',      // #f59e0b
              'var(--error)',        // #ef4444
              'var(--info)',         // #3b82f6
              'var(--secondary)',    // #64748b
              'var(--accent)'        // #f59e0b
            ];
            const color = yearColors[index % yearColors.length];
            return (
              <div key={metric} className={styles.legendItem}>
                <div 
                  className={styles.legendColor} 
                  style={{ backgroundColor: color }}
                ></div>
                <span>{metric}</span>
              </div>
            );
          })}
          </div>
        </div>
        <div className={styles.chart}>
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Нет данных для отображения
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.chartContainer} ${noMargins ? styles.noMargins : ''} ${disableAnimations ? `${styles.noAnimations} export-mode` : ''}`}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>{title || 'График'}</div>
        <div className={styles.chartLegend}>
          {selectedMetrics.includes('plan') && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendColorPlan}`}></div>
              <span>План</span>
            </div>
          )}
          {(selectedMetrics.includes('actual') || selectedMetrics.includes('fact')) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendColorFact}`}></div>
              <span>Факт</span>
            </div>
          )}
          {selectedMetrics.includes('deviation') && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendColorDeviation}`}></div>
              <span>Отклонение</span>
            </div>
          )}
          {selectedMetrics.includes('percentage') && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.legendColorPercentage}`}></div>
              <span>% выполнения</span>
            </div>
          )}
                      {/* Динамическая легенда для других метрик (годы, категории и т.д.) */}
            {selectedMetrics.filter(metric => !['plan', 'actual', 'fact', 'deviation', 'percentage'].includes(metric)).map((metric, index) => {
              // Цвета для годовых столбцов из globals.css (соответствуют цветам столбцов)
              const yearColors = [
                'var(--primary)',      // #4f46e5
                'var(--success)',      // #10b981
                'var(--warning)',      // #f59e0b
                'var(--error)',        // #ef4444
                'var(--info)',         // #3b82f6
                'var(--secondary)',    // #64748b
                'var(--accent)'        // #f59e0b
              ];
              const color = yearColors[index % yearColors.length];
              return (
                <div key={metric} className={styles.legendItem}>
                  <div 
                    className={styles.legendColor} 
                    style={{ backgroundColor: color }}
                  ></div>
                  <span>{metric}</span>
                </div>
              );
            })}
        </div>
      </div>
      <div className={styles.chart} ref={chartRef}>
        {/* График будет создан динамически */}
      </div>
    </div>
  );
});

export default Chart; 
 
 
 
 
 
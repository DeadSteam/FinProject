 import React, {useEffect, useRef, useState} from 'react';

import styles from '@styles/components/Chart.module.css';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

const Chart = React.memo(({ data, title, isFiltering = false, type = 'bar', selectedMetrics = ['plan', 'actual'], disableAnimations = false }) => {
  const chartRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentData, setCurrentData] = useState(data);

  // Отслеживаем изменения данных для плавного перехода
  useEffect(() => {
    if (!data) return;
    
    // Если данные изменились и мы не в процессе фильтрации
    if (!isFiltering && JSON.stringify(data) !== JSON.stringify(currentData)) {
      setCurrentData(data);
    }
  }, [data, isFiltering, currentData]);

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
        const factValue = item.fact || 0;
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
        const fact = parseFloat(item.fact) || 0;
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
            renderChart();
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
      } else if (type === 'pie') {
        renderPieChart();
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
          { key: 'actual', height: item.factHeight, value: item.fact || 0, type: 'Факт', className: styles.chartBarFact },
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
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 600 250');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.maxHeight = '250px';
      
      const width = 600;
      const height = 250;
      const padding = 40;
      const chartWidth = width - 2 * padding;
      const chartHeight = height - 2 * padding;
      
      // Создаем линии для всех выбранных метрик (Recharts подход)
      const metricsToRender = [
        { key: 'plan', title: 'План', color: 'var(--primary-light)', getData: (item) => item.plan || 0 },
        { key: 'actual', title: 'Факт', color: 'var(--primary)', getData: (item) => item.fact || 0 },
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
    
    function renderPieChart() {
      if (!chartRef.current) return;
      
      // Создаем контейнер для круговых диаграмм
      const pieContainer = document.createElement('div');
      pieContainer.className = styles.chartPieContainer;
      
      // Определяем какие метрики показывать на основе selectedMetrics
      const metricsToShow = [];
      if (selectedMetrics.includes('plan')) {
        metricsToShow.push({
          key: 'plan',
          title: 'План',
          color: 'var(--primary-light)',
          getValue: (item) => parseFloat(item.plan) || 0
        });
      }
      if (selectedMetrics.includes('actual') || selectedMetrics.includes('fact')) {
        metricsToShow.push({
          key: 'fact',
          title: 'Факт',
          color: 'var(--primary)',
          getValue: (item) => parseFloat(item.fact) || 0
        });
      }
      if (selectedMetrics.includes('deviation')) {
        metricsToShow.push({
          key: 'deviation',
          title: 'Отклонение',
          color: 'var(--warning)',
          getValue: (item) => parseFloat(item.deviation) || 0
        });
      }
      if (selectedMetrics.includes('percentage')) {
        metricsToShow.push({
          key: 'percentage',
          title: '% выполнения',
          color: 'var(--success)',
          getValue: (item) => parseFloat(item.percentage) || 0
        });
      }

      // Если нет выбранных метрик, показываем план и факт по умолчанию
      if (metricsToShow.length === 0) {
        metricsToShow.push(
          {
            key: 'plan',
            title: 'План',
            color: 'var(--primary-light)',
            getValue: (item) => parseFloat(item.plan) || 0
          },
          {
            key: 'fact',
            title: 'Факт',
            color: 'var(--primary)',
            getValue: (item) => parseFloat(item.fact) || 0
          }
        );
      }

      // Создаем SVG с динамическими размерами
      const chartWidth = metricsToShow.length * 200;
      const chartHeight = 300;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '300px');
      svg.style.display = 'block';
      svg.style.margin = '0 auto';
      
      const radius = 70;
      
      metricsToShow.forEach((metric, metricIndex) => {
        const centerX = 100 + metricIndex * 200;
        const centerY = 150;
        
        // Вычисляем общую сумму для этой метрики
        const total = chartData.reduce((sum, item) => sum + metric.getValue(item), 0);
        
        // Создаем заголовок для диаграммы
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', centerX);
        title.setAttribute('y', 40);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('fill', metric.color);
        title.setAttribute('font-size', '16');
        title.setAttribute('font-weight', '600');
        title.textContent = metric.title;
        svg.appendChild(title);
        
        // Создаем круговую диаграмму для этой метрики
        if (total > 0) {
          let currentAngle = -Math.PI / 2; // Начинаем сверху
          
          // Цвета используя точные переменные из globals.css  
          let colors;
          if (metric.key === 'plan') {
            // Оттенки --primary-light (#c7d2fe)
            colors = ['#f3f4ff', '#e9ebff', '#dfe2ff', '#d5d9ff', '#c7d2fe', '#b8c5fd', '#a9b8fc', '#9aabfb'];
          } else if (metric.key === 'fact') {
            // Оттенки --primary (#4f46e5)
            colors = ['#f0f0ff', '#e1e0ff', '#d2d0ff', '#c3c0ff', '#4f46e5', '#443ddc', '#3934d3', '#2e2bca'];
          } else if (metric.key === 'deviation') {
            // Оттенки --warning (#f59e0b)
            colors = ['#fef9f0', '#fdf3e1', '#fcecd2', '#fbe6c3', '#f59e0b', '#ec910a', '#e38409', '#da7708'];
          } else if (metric.key === 'percentage') {
            // Оттенки --success (#10b981)
            colors = ['#f0fdf9', '#e6fbf3', '#dcf9ed', '#d2f7e7', '#10b981', '#0ea574', '#0c9167', '#0a7d5a'];
          } else {
            // --info (#3b82f6)
            colors = ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];
          }
          
          chartData.forEach((item, pieIndex) => {
            const value = metric.getValue(item);
            if (value > 0) {
              const angle = (value / total) * 2 * Math.PI;
              
              const x1 = centerX + radius * Math.cos(currentAngle);
              const y1 = centerY + radius * Math.sin(currentAngle);
              const x2 = centerX + radius * Math.cos(currentAngle + angle);
              const y2 = centerY + radius * Math.sin(currentAngle + angle);
              
              const largeArcFlag = angle > Math.PI ? 1 : 0;
              
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              const d = angle >= 2 * Math.PI - 0.01
                ? `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY}`
                : `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
              path.setAttribute('d', d);
              
              // Используем разные цвета для разных элементов
              path.setAttribute('fill', colors[pieIndex % colors.length]);
              path.setAttribute('stroke', '#ffffff');
              path.setAttribute('stroke-width', '2');
              path.setAttribute('class', styles.chartPieSlice);
              if (metric.key === 'percentage') {
                const safe = Number.isFinite(value) ? value : 0;
                path.dataset.value = `${safe.toFixed(1)}%`;
              } else {
                path.dataset.value = value.toString();
              }
              path.dataset.type = metric.title;
              path.dataset.period = item.label || '';
              
              svg.appendChild(path);
              currentAngle += angle;
            }
          });
        }
        
        // Добавляем итоговое значение в центр
        const totalText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        totalText.setAttribute('x', centerX);
        totalText.setAttribute('y', centerY + 5);
        totalText.setAttribute('text-anchor', 'middle');
        totalText.setAttribute('fill', 'var(--text-primary)');
        totalText.setAttribute('font-size', '12');
        totalText.setAttribute('font-weight', '600');
        if (metric.key === 'percentage') {
          const denom = chartData.length || 1;
          const avg = total / denom;
          const safe = Number.isFinite(avg) ? avg : 0;
          totalText.textContent = `${safe.toFixed(1)}%`;
        } else {
          totalText.textContent = total.toLocaleString('ru-RU');
        }
        svg.appendChild(totalText);
      });
      
      pieContainer.appendChild(svg);
      chartRef.current.appendChild(pieContainer);
      
      // Добавляем tooltip  
      addTooltip(chartRef.current);
    }
    
    function addTooltip(container) {
      const tooltip = document.createElement('div');
      tooltip.className = styles.tooltip;
      tooltip.style.display = 'none';
      container.appendChild(tooltip);
      
      const elements = container.querySelectorAll(`.${styles.chartPoint}, .${styles.chartPieSlice}`);
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
    }, [currentData, type]);

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
      <div className={styles.chartContainer}>
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
    <div className={`${styles.chartContainer} ${disableAnimations ? `${styles.noAnimations} export-mode` : ''}`}>
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
 
 
 
 
 
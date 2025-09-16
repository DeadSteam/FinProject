/**
 * Общие компоненты для состояний графиков
 * Устраняет дублирование кода в разных компонентах
 */

import React from 'react';

/**
 * Компонент состояния загрузки
 */
export const ChartLoading = ({ message = 'Загрузка данных...' }) => (
  <div className="text-center p-4">
    <div className="spinner-border text-primary" role="status">
      <span className="sr-only">Загрузка...</span>
    </div>
    <p className="mt-2">{message}</p>
  </div>
);

/**
 * Компонент состояния отсутствия данных
 */
export const ChartNoData = ({ 
  title = 'Нет данных для отображения',
  message = 'Выберите фильтры для отображения данных',
  icon = 'chart'
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
            <path d="M3 3v18h18"/>
            <path d="M18.7 8l-5.1 5.1-2.8-2.8L7 14.1"/>
          </svg>
        );
      case 'trends':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
            <path d="M3 3v18h18"/>
            <path d="M7 12l3-3 3 3 5-5"/>
          </svg>
        );
      case 'comparison':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
            <path d="M3 3v18h18"/>
            <path d="M18.7 8l-5.1 5.1-2.8-2.8L7 14.1"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
            <path d="M3 3v18h18"/>
            <path d="M18.7 8l-5.1 5.1-2.8-2.8L7 14.1"/>
          </svg>
        );
    }
  };

  return (
    <div className="text-center p-4 text-muted">
      <div className="mb-3">
        {getIcon()}
      </div>
      <h5>{title}</h5>
      <p>{message}</p>
    </div>
  );
};

/**
 * Компонент для выбора показателей
 */
export const ChartSelectMetrics = ({ message = 'Выберите показатели' }) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="text-center p-4 text-muted">
        <h5>{message}</h5>
        <p>Для просмотра графиков выберите показатели в фильтрах</p>
      </div>
    </div>
  </div>
);

/**
 * Компонент заголовка графика
 */
export const ChartHeader = ({ 
  title, 
  subtitle, 
  showHeader = false 
}) => {
  if (!showHeader) return null;

  return (
    <div className="row mb-4">
      <div className="col-12">
        <h4 className="mb-0">{title}</h4>
        {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
      </div>
    </div>
  );
};

export default {
  ChartLoading,
  ChartNoData,
  ChartSelectMetrics,
  ChartHeader
};

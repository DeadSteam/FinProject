import React, { useState } from 'react';

import { useToast } from '../../context/AppContext';
import { useForm } from '../../hooks';
import { useMetricService } from '../../services/index.js';
import Button from '../ui/Button';
import Modal from './Modal';
import styles from './Modal.module.css';

const YearlyPlanModal = ({ isOpen, onClose, onSuccess, metrics = [], shops = [], selectedShop, selectedYear }) => {
  const { showToast } = useToast();
  const metricService = useMetricService();
  const [isLoading, setIsLoading] = useState(false);

  // Используем useForm для управления формой
  const planForm = useForm(
    {
      metricId: '',
      yearlyValue: ''
    },
    {
      metricId: (value) => !value ? 'Выберите метрику' : null,
      yearlyValue: (value) => {
        if (!value) return 'Введите значение годового плана';
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) {
          return 'Введите корректное значение годового плана';
        }
        return null;
      }
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!planForm.validate()) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Получаем параметры из props или URL
      const urlParams = new URLSearchParams(window.location.search);
      const shopId = selectedShop && selectedShop !== 'all' ? selectedShop : urlParams.get('shop') || urlParams.get('store');
      const year = selectedYear || urlParams.get('year') || new Date().getFullYear();
      
      console.log('YearlyPlanModal submit params:', {
        metricId: planForm.values.metricId,
        shopId,
        year: parseInt(year),
        yearlyValue: parseFloat(planForm.values.yearlyValue),
        selectedShop,
        selectedYear
      });
      
      if (!shopId || shopId === 'all') {
        showToast('Выберите конкретный магазин для создания плана', 'error');
        return;
      }
      
      // Создаем годовой план (автоматически распределяется по месяцам на backend)
      console.log('Calling distributeYearlyPlan with:', {
        metricId: planForm.values.metricId,
        shopId,
        year: parseInt(year),
        yearlyValue: parseFloat(planForm.values.yearlyValue)
      });
      
      const result = await metricService.distributeYearlyPlan(
        planForm.values.metricId,
        shopId,
        parseInt(year),
        parseFloat(planForm.values.yearlyValue)
      );
      
      console.log('distributeYearlyPlan result:', result);
      
      showToast('Годовой план успешно создан и распределен по месяцам', 'success');
      
      // Очищаем форму
      planForm.reset();
      
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      showToast('Ошибка при создании годового плана', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isLoading}>
        Отмена
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Добавить годовой план"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="yearly-metric-select">
            Метрика <span className={styles.required}>*</span>
          </label>
          <select
            id="yearly-metric-select"
            name="metricId"
            className={styles.formControl}
            value={planForm.values.metricId}
            onChange={planForm.handleInputChange}
            disabled={isLoading}
            required
          >
            <option value="">
              {metrics.length === 0 ? 'Загрузка метрик...' : 'Выберите метрику'}
            </option>
            {metrics.map(metric => (
              <option key={metric.id} value={metric.id}>
                {metric.name} ({metric.unit})
              </option>
            ))}
          </select>
          {planForm.errors.metricId && (
            <div className={styles.errorMessage}>{planForm.errors.metricId}</div>
          )}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="yearly-value">
            Годовой план <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            id="yearly-value"
            name="yearlyValue"
            className={styles.formControl}
            value={planForm.values.yearlyValue}
            onChange={planForm.handleInputChange}
            min="0"
            step="0.01"
            disabled={isLoading}
            required
          />
          {planForm.errors.yearlyValue && (
            <div className={styles.errorMessage}>{planForm.errors.yearlyValue}</div>
          )}
        </div>
        <div className={styles.formGroup}>
          <div className={styles.infoMessage}>
            План будет равномерно распределен по месяцам года.
            {selectedShop === 'all' && (
              <div style={{color: '#f39801', marginTop: '8px'}}>
                ⚠️ Выберите конкретный магазин в фильтрах для создания плана.
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default React.memo(YearlyPlanModal);
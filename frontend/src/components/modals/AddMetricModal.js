import React, { useState } from 'react';

import { useToast } from '../../context/AppContext';
import { useForm } from '../../hooks';
import { useMetricService } from '../../services/index.js';
import Button from '../ui/Button';
import Modal from './Modal';
import styles from './Modal.module.css';

const AddMetricModal = ({ isOpen, onClose, onSuccess, categoryId, storeId }) => {
  const { showToast } = useToast();
  const metricService = useMetricService();
  const [isLoading, setIsLoading] = useState(false);

  // Используем useForm для управления формой
  const metricForm = useForm(
    {
      name: '',
      unit: ''
    },
    {
      name: (value) => !value.trim() ? 'Введите название метрики' : null,
      unit: (value) => !value.trim() ? 'Введите единицу измерения' : null
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!metricForm.validate()) {
      return;
    }

    try {
      setIsLoading(true);
      const metricData = {
        name: metricForm.values.name.trim(),
        unit: metricForm.values.unit.trim(),
        category_id: categoryId,
        store_id: storeId
      };

      await metricService.createMetric(metricData);
      showToast('Метрика успешно добавлена', 'success');
      
      // Очищаем форму
      metricForm.reset();
      
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      showToast('Ошибка при добавлении метрики', 'error');
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
      title="Добавить метрику"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="metric-name">
            Название метрики <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="metric-name"
            name="name"
            className={styles.formControl}
            value={metricForm.values.name}
            onChange={metricForm.handleInputChange}
            placeholder="Например: Отработанные часы"
            disabled={isLoading}
            required
          />
          {metricForm.errors.name && (
            <div className={styles.errorMessage}>{metricForm.errors.name}</div>
          )}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="metric-unit">
            Единица измерения <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="metric-unit"
            name="unit"
            className={styles.formControl}
            value={metricForm.values.unit}
            onChange={metricForm.handleInputChange}
            placeholder="Например: ч, руб, шт"
            disabled={isLoading}
            required
          />
          {metricForm.errors.unit && (
            <div className={styles.errorMessage}>{metricForm.errors.unit}</div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default AddMetricModal; 
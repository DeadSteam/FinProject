import React, { useState } from 'react';

import { useToast } from '../../context/AppContext';
import { useForm } from '../../hooks';
import { useMetricService } from '../../services/index.js';
import Button from '../ui/Button';
import Modal from './Modal';
import styles from './Modal.module.css';

const InitYearModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const metricService = useMetricService();
  const [isLoading, setIsLoading] = useState(false);

  // Используем useForm для управления формой
  const yearForm = useForm(
    {
      year: new Date().getFullYear()
    },
    {
      year: (value) => {
        const numValue = parseInt(value);
        if (!numValue || numValue < 2000 || numValue > 2100) {
          return 'Введите корректный год (2000-2100)';
        }
        return null;
      }
    }
  );

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!yearForm.validate()) {
      return;
    }

    try {
      setIsLoading(true);
      const year = parseInt(yearForm.values.year);
      await metricService.initializeYear ? metricService.initializeYear(year) : metricService.api.post('/finance/periods/init-year', { year });
      showToast(`Периоды для ${year} года успешно созданы`, 'success');
      onSuccess && onSuccess(year);
      onClose();
    } catch (error) {
      showToast('Ошибка при инициализации года', 'error');
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
        {isLoading ? 'Инициализация...' : 'Инициализировать'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Инициализация года"
      footer={footer}
    >
      <p>Укажите год для инициализации периодов (год, кварталы, месяцы):</p>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="init-year">Год</label>
          <input
            type="number"
            id="init-year"
            className={styles.formControl}
            value={yearForm.values.year}
            onChange={(e) => yearForm.handleChange('year', parseInt(e.target.value))}
            min="2000"
            max="2100"
            disabled={isLoading}
          />
          {yearForm.errors.year && (
            <div className={styles.errorMessage}>{yearForm.errors.year}</div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default InitYearModal; 
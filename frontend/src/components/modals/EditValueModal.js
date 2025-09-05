import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useToast } from '../../context/AppContext';
import { useMetricService } from '../../services/index.js';
import { useDataVersioning } from '../../hooks';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from './Modal';

const EditValueModal = ({ 
    isOpen, 
    onClose, 
    editData,
    onSave,
    metrics = [],
    periods = [],
    shops = [],
    selectedShop = 'all',
    selectedYear = new Date().getFullYear()
}) => {
    const { showToast } = useToast();
    const metricService = useMetricService();
    const { createVersion } = useDataVersioning();

    // Простое состояние формы без useForm
    const [formData, setFormData] = useState({
        value: '',
        recalculatePlan: true
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Обновляем форму при изменении editData
    useEffect(() => {
        if (isOpen && editData) {
            setFormData({
                value: editData.currentValue || '',
                recalculatePlan: true
            });
            setErrors({});
        } else {
            setFormData({
                value: '',
                recalculatePlan: true
            });
            setErrors({});
        }
    }, [isOpen, editData]);

    // Мемоизируем вычисления для избежания лишних рендеров
    const metricInfo = useMemo(() => {
        if (!editData || !metrics.length) return null;
        return metrics.find(m => m.id === editData.metricId);
    }, [editData, metrics]);

    const periodInfo = useMemo(() => {
        if (!editData) return null;
        
        // Сначала пытаемся найти реальный период
        if (periods.length && editData.periodId) {
            const realPeriod = periods.find(p => p.id === editData.periodId);
            if (realPeriod) return realPeriod;
        }
        
        // Если не найден реальный период, создаем виртуальный на основе rowData
        if (editData.rowData) {
            const year = parseInt(selectedYear);
            
            if (editData.rowData.month) {
                return {
                    id: `virtual-month-${editData.rowData.month}`,
                    year,
                    month: editData.rowData.month,
                    quarter: null
                };
            }
            
            if (editData.rowData.quarter) {
                return {
                    id: `virtual-quarter-${editData.rowData.quarter}`,
                    year,
                    month: null,
                    quarter: editData.rowData.quarter
                };
            }
        }
        
        return null;
    }, [editData, periods, selectedYear]);

    const shopInfo = useMemo(() => {
        if (!Array.isArray(shops) || !shops.length || selectedShop === 'all') return 'Все магазины';
        
        // Пробуем найти по строковому и числовому ID
        const shop = shops.find(s => 
            s.id === selectedShop || 
            s.id === parseInt(selectedShop) || 
            s.id.toString() === selectedShop
        );
        return shop ? shop.name : 'Неизвестный магазин';
    }, [shops, selectedShop]);

    const formatPeriodName = useCallback((period) => {
        if (!period) return 'Неизвестный период';
        
        if (period.quarter && !period.month) {
            const quarterNames = {
                1: 'I квартал', 2: 'II квартал', 3: 'III квартал', 4: 'IV квартал'
            };
            return `${quarterNames[period.quarter]} ${period.year}`;
        }
        
        if (period.month) {
            const monthNames = {
                1: 'Январь', 2: 'Февраль', 3: 'Март', 4: 'Апрель', 5: 'Май', 6: 'Июнь',
                7: 'Июль', 8: 'Август', 9: 'Сентябрь', 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
            };
            return `${monthNames[period.month]} ${period.year}`;
        }
        
        return `${period.year} год`;
    }, []);

    // Обработчики формы
    const handleInputChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Очищаем ошибку для поля при изменении
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    }, [errors]);

    const validateForm = useCallback(() => {
        const newErrors = {};
        
        if (!formData.value) {
            newErrors.value = 'Введите значение';
        } else {
            const numValue = parseFloat(formData.value);
            if (isNaN(numValue)) {
                newErrors.value = 'Введите корректное числовое значение';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData.value]);

    // Функция отправки формы
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!editData || loading) return;
        
        if (!validateForm()) {
            showToast('Пожалуйста, исправьте ошибки в форме', 'error');
            return;
        }
        
        if (!metricInfo || !periodInfo) {
            showToast('Ошибка: не удается найти информацию о метрике или периоде', 'error');
            return;
        }

        setLoading(true);

        try {
            const newValue = parseFloat(formData.value);
            
            // Используем shopId из editData или определяем из selectedShop
            let shopId;
            if (editData.shop === 'all') {
                shopId = null;
            } else if (editData.shop) {
                // Если shop - это уже UUID, используем как есть
                shopId = editData.shop;
            } else {
                shopId = selectedShop === 'all' ? null : selectedShop;
            }

            // Используем период из editData, если доступен
            const periodParams = editData.period || {
                year: periodInfo.year,
                month: periodInfo.month || null,
                quarter: periodInfo.quarter || null
            };

            // 📊 Создаем версию перед изменением данных
            try {
                const versionData = {
                    entity: 'finance_values',
                    entityId: editData.metricId,
                    data: {
                        metric: metricInfo,
                        period: periodInfo,
                        shop: shopInfo,
                        oldValue: editData.currentValue,
                        newValue: newValue,
                        valueType: editData.type,
                        recalculatePlan: editData.type === 'fact' && formData.recalculatePlan
                    },
                    metadata: {
                        action: `edit_${editData.type}_value`,
                        user: 'current_user', // TODO: получить из контекста авторизации
                        timestamp: Date.now(),
                        metricName: metricInfo.name,
                        periodName: formatPeriodName(periodInfo),
                        shopName: shopInfo,
                        year: selectedYear
                    }
                };

                await createVersion(versionData);
            } catch (versionError) {
                console.warn('Не удалось создать версию:', versionError);
                // Продолжаем сохранение даже если версионирование не сработало
            }
            
            if (editData.type === 'plan') {
                // Обновление планового значения
                await metricService.updatePlanValueByPeriod ? 
                    metricService.updatePlanValueByPeriod(
                    editData.metricId,
                    shopId,
                    periodParams.year,
                    newValue,
                    periodParams.month,
                    periodParams.quarter
                    ) : metricService.api.put('/finance/plan-values/by-period', {
                        metric_id: editData.metricId,
                        shop_id: shopId,
                        year: periodParams.year,
                        value: newValue,
                        month: periodParams.month,
                        quarter: periodParams.quarter
                    });
                
                showToast('Плановое значение успешно обновлено', 'success');
            } else {
                // Сначала обновляем фактическое значение
                const result = await metricService.updateActualValueByPeriod ? 
                    metricService.updateActualValueByPeriod(
                    editData.metricId,
                    shopId,
                    periodParams.year,
                    newValue,
                    periodParams.month,
                    periodParams.quarter
                    ) : metricService.api.put('/finance/actual-values/by-period', {
                        metric_id: editData.metricId,
                        shop_id: shopId,
                        year: periodParams.year,
                        value: newValue,
                        month: periodParams.month,
                        quarter: periodParams.quarter
                    });

                // Пересчет плана, если необходимо
                if (formData.recalculatePlan && periodParams.month) {
                    try {
                        await metricService.recalculatePlanWithActual({
                            metric_id: editData.metricId,
                            shop_id: shopId,
                            year: periodParams.year,
                            actual_month: periodParams.month,
                            actual_value: newValue
                        });
                        showToast('Фактическое значение обновлено и план пересчитан', 'success');
                    } catch (recalcError) {
                        console.warn('План не удалось пересчитать:', recalcError);
                        showToast('Фактическое значение обновлено, но план не пересчитан', 'warning');
                    }
                } else {
                    showToast('Фактическое значение успешно обновлено', 'success');
                }
            }
            
            onSave && onSave();
            onClose();
        } catch (error) {
            showToast('Ошибка при обновлении значения', 'error');
        } finally {
            setLoading(false);
        }
    }, [editData, formData, loading, validateForm, metricInfo, periodInfo, selectedShop, metricService, showToast, onSave, onClose]);

    // Используем мемоизированные значения
    const metric = metricInfo;
    const period = periodInfo;

    const modalFooter = (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
                variant="secondary"
                onClick={onClose}
                disabled={loading}
            >
                Отмена
            </Button>
            <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
                loading={loading}
            >
                Сохранить
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Редактирование значения"
            size="md"
            footer={modalFooter}
        >
            <form onSubmit={handleSubmit}>
                {/* Информация о метрике */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Метрика
                    </label>
                    <div style={{ 
                        padding: '0.5rem 0.75rem', 
                        backgroundColor: 'var(--background)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--input-border-radius)',
                        fontWeight: '500'
                    }}>
                        {metric ? `${metric.name} (${metric.unit})` : 'Загрузка...'}
                    </div>
                </div>

                {/* Информация о периоде */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Период
                    </label>
                    <div style={{ 
                        padding: '0.5rem 0.75rem', 
                        backgroundColor: 'var(--background)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--input-border-radius)',
                        fontWeight: '500'
                    }}>
                        {formatPeriodName(period)}
                    </div>
                </div>

                {/* Информация о магазине */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        Магазин
                    </label>
                    <div style={{ 
                        padding: '0.5rem 0.75rem', 
                        backgroundColor: 'var(--background)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--input-border-radius)',
                        fontWeight: '500'
                    }}>
                        {shopInfo}
                    </div>
                </div>

                {/* Информация о плане (только для фактических значений) */}
                {editData?.type === 'fact' && editData?.planValue !== undefined && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Плановое значение на этот период
                        </label>
                        <div style={{ 
                            padding: '0.5rem 0.75rem', 
                            backgroundColor: '#f0f9ff', 
                            border: '1px solid #0ea5e9', 
                            borderRadius: 'var(--input-border-radius)',
                            fontWeight: '600',
                            color: '#0369a1'
                        }}>
                            {editData.planValue?.toLocaleString('ru-RU') || '0'} {metric?.unit || ''}
                        </div>
                    </div>
                )}

                {/* Поле ввода значения */}
                <div style={{ marginBottom: '1rem' }}>
                    <Input
                        label={`${editData?.type === 'plan' ? 'Плановое' : 'Фактическое'} значение`}
                        type="number"
                        name="value"
                        value={formData.value}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder={`Введите значение ${metric ? `(${metric.unit})` : ''}`}
                    />
                    {errors.value && (
                        <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            {errors.value}
                        </div>
                    )}
                </div>

                {/* Опция пересчета плана (только для фактических значений месяцев) */}
                {editData?.type === 'fact' && period?.month && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}>
                            <input
                                type="checkbox"
                                name="recalculatePlan"
                                checked={formData.recalculatePlan}
                                onChange={handleInputChange}
                                style={{ marginRight: '0.5rem' }}
                            />
                            <span>Пересчитать план на оставшиеся месяцы</span>
                            <span style={{ 
                                color: 'var(--text-secondary)', 
                                fontSize: '0.85rem',
                                marginLeft: '0.5rem'
                            }}>
                                ℹ️
                            </span>
                        </label>
                        <div style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-secondary)', 
                            marginTop: '0.25rem',
                            marginLeft: '1.5rem'
                        }}>
                            Если фактическое значение отличается от планового, план на оставшиеся месяцы будет скорректирован
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default React.memo(EditValueModal);
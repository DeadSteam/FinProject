import { useState, useCallback } from 'react';

import { useToast } from '../context/AppContext';
import { validatePhone } from '../utils/phoneUtils';

/**
 * Универсальный хук для управления формами
 * Заменяет повторяющуюся логику форм в AdminUsers, AdminCategories, AdminShops, AdminMetrics
 */
export const useForm = (initialValues = {}, validationRules = {}, options = {}) => {
  const { showToast } = useToast();
  
  const {
    validateOnChange = false,
    validateOnBlur = true,
    showValidationMessages = true,
    resetOnSubmitSuccess = true
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    if (typeof rules === 'function') {
      const result = rules(value, values);
      return result?.message || result || null;
    }

    if (typeof rules === 'object') {
      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        return rules.required === true ? 'Поле обязательно для заполнения' : rules.required;
      }

      if (rules.minLength && value && value.length < rules.minLength) {
        return `Минимальная длина: ${rules.minLength} символов`;
      }

      if (rules.maxLength && value && value.length > rules.maxLength) {
        return `Максимальная длина: ${rules.maxLength} символов`;
      }

      if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Некорректный email адрес';
      }

      if (rules.phone && value) {
        // Используем функцию validatePhone для более точной валидации
        const phoneValidation = validatePhone ? validatePhone(value) : { isValid: true };
        if (!phoneValidation.isValid) {
          return phoneValidation.message || 'Некорректный номер телефона';
        }
      }

      if (rules.number && value && isNaN(Number(value))) {
        return 'Значение должно быть числом';
      }

      if (rules.min !== undefined && value && Number(value) < rules.min) {
        return `Минимальное значение: ${rules.min}`;
      }

      if (rules.max !== undefined && value && Number(value) > rules.max) {
        return `Максимальное значение: ${rules.max}`;
      }
    }

    return null;
  }, [validationRules, values]);

  const validate = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationRules]);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);

    if (validateOnChange) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    } else if (errors[name]) {
      const error = validateField(name, value);
      if (!error) {
        setErrors(prev => ({ ...prev, [name]: null }));
      }
    }
  }, [validateField, validateOnChange, errors]);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    handleChange(name, newValue);
  }, [handleChange]);

  const handleSubmit = useCallback(async (onSubmit) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Используем актуальные значения из состояния
      const currentErrors = {};
      let isValid = true;

      Object.keys(validationRules).forEach(fieldName => {
        const error = validateField(fieldName, values[fieldName]);
        if (error) {
          currentErrors[fieldName] = error;
          isValid = false;
        }
      });

      setErrors(currentErrors);
      
      if (!isValid) {
        if (showValidationMessages) {
          // Откладываем showToast на следующий тик
          const timeoutId = setTimeout(() => {
            showToast('Пожалуйста, исправьте ошибки в форме', 'error');
          }, 0);
          
          // Cleanup при размонтировании компонента
          return () => clearTimeout(timeoutId);
        }
        return false;
      }

      const result = await onSubmit(values);

      if (resetOnSubmitSuccess && result !== false) {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsDirty(false);
      }

      return result;
    } catch (error) {
      if (showValidationMessages) {
        // Откладываем showToast на следующий тик
        const timeoutId = setTimeout(() => {
          showToast(`Ошибка при отправке формы: ${error.message}`, 'error');
        }, 0);
        
        // Cleanup при размонтировании компонента
        return () => clearTimeout(timeoutId);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateField, validationRules, showValidationMessages, resetOnSubmitSuccess, initialValues]);

  const reset = useCallback((newInitialValues) => {
    const resetValues = newInitialValues || initialValues;
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  const setFormValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
    setIsDirty(true);
  }, []);

  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] || '',
    onChange: handleInputChange,
    error: errors[name]
  }), [values, errors, handleInputChange]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid: Object.keys(errors).every(key => !errors[key]),
    handleChange,
    handleInputChange,
    handleSubmit,
    reset,
    setFormValues,
    validate,
    validateField,
    getFieldProps
  };
};

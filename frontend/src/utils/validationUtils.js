import { VALIDATION } from '../config/constants.js';
import { NUMERIC_CONSTANTS, INDEX_OFFSETS } from '../config/magic-numbers.js';

/**
 * Валидация электронной почты
 * @param {string} email - Адрес электронной почты
 * @returns {boolean} - Результат проверки
 */
export const isValidEmail = (email) => {
    if (!email) return true; // Пустой email считаем валидным (для необязательных полей)
    return VALIDATION.EMAIL_REGEX.test(email);
};

/**
 * Валидация номера телефона
 * @param {string} phone - Номер телефона
 * @returns {boolean} - Результат проверки
 */
export const isValidPhoneNumber = (phone) => {
    if (!phone) return true; // Пустой номер считаем валидным (для необязательных полей)

    // Формат +7 (999) 123-45-67
    const strictPhoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

    // Более свободный формат для приема разных вариантов ввода
    const loosePhoneRegex = /^(\+7|8)?[\s\-]?\(?(\d{3})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})$/;
    
    return strictPhoneRegex.test(phone) || loosePhoneRegex.test(phone);
};

/**
 * Форматирование номера телефона в стандартный формат
 * @param {string} phone - Номер телефона в произвольном формате
 * @returns {string} - Отформатированный номер телефона
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    
    // Удаляем все символы, кроме цифр
    const digits = phone.replace(/\D/g, '');

    // Проверяем, начинается ли номер с 7 или 8
    const startWith7or8 = /^[78]/.test(digits);
    const phoneDigits = startWith7or8 ? digits.substring(1) : digits;

    // Если недостаточно цифр, возвращаем исходную строку
    if (phoneDigits.length < NUMERIC_CONSTANTS.PHONE_LENGTH_MIN) return phone;

    // Форматируем номер в формат +7 (999) 123-45-67
    return `+7 (${phoneDigits.substring(0, INDEX_OFFSETS.THIRD_CHAR)}) ${phoneDigits.substring(INDEX_OFFSETS.THIRD_CHAR, INDEX_OFFSETS.QUARTERS.Q2_START)}-${phoneDigits.substring(INDEX_OFFSETS.QUARTERS.Q2_START, INDEX_OFFSETS.QUARTERS.Q3_START)}-${phoneDigits.substring(INDEX_OFFSETS.QUARTERS.Q3_START, NUMERIC_CONSTANTS.PHONE_LENGTH_MIN)}`;
};

/**
 * Валидация пароля
 * @param {string} password - Пароль
 * @returns {Object} - Результат валидации с сообщением
 */
export const validatePassword = (password) => {
    if (!password) {
        return { isValid: false, message: 'Пароль обязателен' };
    }
    
    if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
        return { 
            isValid: false, 
            message: `Минимальная длина пароля: ${VALIDATION.PASSWORD_MIN_LENGTH} символов` 
        };
    }
    
    return { isValid: true, message: '' };
};

/**
 * Валидация имени
 * @param {string} name - Имя
 * @returns {Object} - Результат валидации с сообщением
 */
export const validateName = (name) => {
    if (!name || name.trim().length === 0) {
        return { isValid: false, message: 'Имя обязательно' };
    }
    
    if (name.trim().length < VALIDATION.NAME_MIN_LENGTH) {
        return { 
            isValid: false, 
            message: `Минимальная длина имени: ${VALIDATION.NAME_MIN_LENGTH} символа` 
        };
    }
    
    if (name.trim().length > VALIDATION.NAME_MAX_LENGTH) {
        return { 
            isValid: false, 
            message: `Максимальная длина имени: ${VALIDATION.NAME_MAX_LENGTH} символов` 
        };
    }
    
    return { isValid: true, message: '' };
};

/**
 * Валидация обязательного поля
 * @param {string} value - Значение поля
 * @param {string} fieldName - Название поля для сообщения об ошибке
 * @returns {Object} - Результат валидации с сообщением
 */
export const validateRequired = (value, fieldName = 'Поле') => {
    if (!value || value.toString().trim().length === 0) {
        return { isValid: false, message: `${fieldName} обязательно для заполнения` };
    }
    
    return { isValid: true, message: '' };
};

/**
 * Валидация совпадения паролей
 * @param {string} password - Пароль
 * @param {string} confirmPassword - Подтверждение пароля
 * @returns {Object} - Результат валидации с сообщением
 */
export const validatePasswordMatch = (password, confirmPassword) => {
    if (password !== confirmPassword) {
        return { isValid: false, message: 'Пароли не совпадают' };
    }
    
    return { isValid: true, message: '' };
};

/**
 * Валидация формы входа
 * @param {Object} formData - Данные формы
 * @returns {Object} - Результат валидации с ошибками по полям
 */
export const validateLoginForm = (formData) => {
    const errors = {};
    
    // Валидация идентификатора (email или телефон)
    if (!formData.identifier || formData.identifier.trim().length === 0) {
        errors.identifier = 'Email или телефон обязательны';
    } else if (formData.identifier.includes('@')) {
        // Если содержит @, проверяем как email
        if (!isValidEmail(formData.identifier)) {
            errors.identifier = 'Некорректный формат email';
        }
    } else {
        // Иначе проверяем как телефон
        if (!isValidPhoneNumber(formData.identifier)) {
            errors.identifier = 'Некорректный формат телефона';
        }
    }
    
    // Валидация пароля
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
        errors.password = passwordValidation.message;
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Валидация формы профиля
 * @param {Object} formData - Данные формы
 * @returns {Object} - Результат валидации с ошибками по полям
 */
export const validateProfileForm = (formData) => {
    const errors = {};
    
    // Валидация имени пользователя
    const nameValidation = validateName(formData.username);
    if (!nameValidation.isValid) {
        errors.username = nameValidation.message;
    }
    
    // Валидация email (если указан)
    if (formData.email && !isValidEmail(formData.email)) {
        errors.email = 'Некорректный формат email';
    }
    
    // Валидация телефона (если указан)
    if (formData.phone_number && !isValidPhoneNumber(formData.phone_number)) {
        errors.phone_number = 'Некорректный формат телефона';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Валидация формы смены пароля
 * @param {Object} formData - Данные формы
 * @returns {Object} - Результат валидации с ошибками по полям
 */
export const validateChangePasswordForm = (formData) => {
    const errors = {};
    
    // Валидация текущего пароля
    const currentPasswordValidation = validateRequired(formData.currentPassword, 'Текущий пароль');
    if (!currentPasswordValidation.isValid) {
        errors.currentPassword = currentPasswordValidation.message;
    }
    
    // Валидация нового пароля
    const newPasswordValidation = validatePassword(formData.newPassword);
    if (!newPasswordValidation.isValid) {
        errors.newPassword = newPasswordValidation.message;
    }
    
    // Валидация подтверждения пароля
    const confirmPasswordValidation = validatePasswordMatch(formData.newPassword, formData.confirmPassword);
    if (!confirmPasswordValidation.isValid) {
        errors.confirmPassword = confirmPasswordValidation.message;
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}; 
 
 
 
 
 
 
 
 
 
import { DATE_FORMATS } from '../config/constants.js';
import { NUMERIC_CONSTANTS, UI_SIZES, INDEX_OFFSETS } from '../config/magic-numbers.js';
import { formatPhone } from './phoneUtils.js';

/**
 * Форматирование числа как валюты
 * @param {number} amount - Сумма
 * @param {string} currency - Валюта (по умолчанию RUB)
 * @returns {string} - Отформатированная сумма
 */
export const formatCurrency = (amount, currency = 'RUB') => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0 ₽';
    }
    
    const formatter = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
};

/**
 * Форматирование числа с разделителями тысяч
 * @param {number} number - Число
 * @returns {string} - Отформатированное число
 */
export const formatNumber = (number) => {
    if (number === null || number === undefined || isNaN(number)) {
        return '0';
    }
    
    return new Intl.NumberFormat('ru-RU').format(number);
};

/**
 * Форматирование процентов
 * @param {number} value - Значение (от 0 до 1 или от 0 до 100)
 * @param {boolean} isDecimal - Является ли значение десятичным (0.5 = 50%)
 * @returns {string} - Отформатированный процент
 */
export const formatPercent = (value, isDecimal = true) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '0%';
    }
    
    const percentage = isDecimal ? value * 100 : value;
    return `${Math.round(percentage)}%`;
};

/**
 * Форматирование даты
 * @param {Date|string} date - Дата
 * @param {string} format - Формат (из DATE_FORMATS)
 * @returns {string} - Отформатированная дата
 */
export const formatDate = (date, format = DATE_FORMATS.SHORT) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    switch (format) {
        case DATE_FORMATS.SHORT:
            return `${day}.${month}.${year}`;
        case DATE_FORMATS.LONG:
            return `${day} ${monthNames[dateObj.getMonth()]} ${year}`;
        case DATE_FORMATS.WITH_TIME:
            return `${day}.${month}.${year} ${hours}:${minutes}`;
        case DATE_FORMATS.ISO:
            return `${year}-${month}-${day}`;
        default:
            return `${day}.${month}.${year}`;
    }
};

/**
 * Форматирование времени назад (относительное время)
 * @param {Date|string} date - Дата
 * @returns {string} - Относительное время
 */
export const formatTimeAgo = (date) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    
    if (diffInSeconds < NUMERIC_CONSTANTS.MINUTES_IN_HOUR) {
        return 'только что';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / NUMERIC_CONSTANTS.MINUTES_IN_HOUR);
    if (diffInMinutes < NUMERIC_CONSTANTS.MINUTES_IN_HOUR) {
        return `${diffInMinutes} мин. назад`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / NUMERIC_CONSTANTS.MINUTES_IN_HOUR);
    if (diffInHours < NUMERIC_CONSTANTS.HOURS_IN_DAY) {
        return `${diffInHours} ч. назад`;
    }
    
    const diffInDays = Math.floor(diffInHours / NUMERIC_CONSTANTS.HOURS_IN_DAY);
    if (diffInDays < NUMERIC_CONSTANTS.DAYS_IN_MONTH) {
        return `${diffInDays} дн. назад`;
    }
    
    const diffInMonths = Math.floor(diffInDays / NUMERIC_CONSTANTS.DAYS_IN_MONTH);
    if (diffInMonths < NUMERIC_CONSTANTS.MONTHS_IN_YEAR) {
        return `${diffInMonths} мес. назад`;
    }
    
    const diffInYears = Math.floor(diffInMonths / NUMERIC_CONSTANTS.MONTHS_IN_YEAR);
    return `${diffInYears} г. назад`;
};

/**
 * Сокращение длинного текста
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина
 * @returns {string} - Сокращенный текст
 */
export const truncateText = (text, maxLength = UI_SIZES.MAGIC_50) => {
    if (!text || text.length <= maxLength) {
        return text || '';
    }
    
    return text.substring(0, maxLength) + '...';
};

/**
 * Форматирование размера файла
 * @param {number} bytes - Размер в байтах
 * @returns {string} - Отформатированный размер
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Б';
    
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Получение статуса в удобном для отображения виде
 * @param {boolean} status - Статус
 * @returns {Object} - Объект с текстом и классом
 */
export const getStatusBadge = (status) => {
    return status 
        ? { text: 'Активен', className: 'status-active' }
        : { text: 'Неактивен', className: 'status-inactive' };
};

/**
 * Форматирование номера телефона для отображения
 * @param {string} phone - Номер телефона
 * @returns {string} - Отформатированный номер
 */
export const formatPhoneForDisplay = (phone) => {
    if (!phone) return 'Не указан';
    
    // Если номер уже отформатирован, возвращаем как есть
    if (phone.includes('(') && phone.includes(')')) {
        return phone;
    }
    
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
 * Форматирование имени пользователя
 * @param {Object} user - Объект пользователя
 * @returns {string} - Отформатированное имя
 */
export const formatUserName = (user) => {
    if (!user) return 'Неизвестно';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const email = user.email || '';
    
    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    }
    
    if (firstName) return firstName;
    if (lastName) return lastName;
    if (email) return email;
    
    return 'Неизвестно';
};

/**
 * Капитализация первой буквы строки
 * @param {string} str - Строка для капитализации
 * @returns {string} - Строка с заглавной первой буквой
 */
export const capitalize = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Форматирование номера телефона (совместимость)
 * @param {string} phone - Номер телефона
 * @returns {string} - Отформатированный номер
 */
export const formatPhoneNumber = (phone) => {
    return formatPhone(phone);
};

/**
 * Форматирование числа с разделителями тысяч (алиас для обратной совместимости)
 * @param {number} number - Число
 * @returns {string} - Отформатированное число
 */
export const formatNumberRu = formatNumber; 
 
 
 
 
 
 
 
 
 
 
 
 
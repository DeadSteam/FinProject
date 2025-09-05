/**
 * Утилиты для работы с номерами телефонов
 */

import { NUMERIC_CONSTANTS, INDEX_OFFSETS } from '../config/magic-numbers.js';

/**
 * Нормализация номера телефона - приведение к единому формату
 * @param {string} phone - Исходный номер телефона
 * @returns {string} - Нормализованный номер в формате +7XXXXXXXXXX
 */
export const normalizePhone = (phone) => {
    if (!phone) return '';

    // Удаляем все символы, кроме цифр
    const digits = phone.replace(/\D/g, '');

    // Если номер пустой после очистки
    if (!digits) return '';

    // Обрабатываем различные форматы
    let normalizedDigits = digits;

    // Если номер начинается с 8, заменяем на 7
    if (normalizedDigits.startsWith('8') && normalizedDigits.length === NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH) {
        normalizedDigits = '7' + normalizedDigits.substring(1);
    }

    // Если номер начинается с 7 и имеет 11 цифр - это правильный формат
    if (normalizedDigits.startsWith('7') && normalizedDigits.length === NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH) {
        return '+' + normalizedDigits;
    }

    // Если номер имеет 10 цифр, добавляем код страны 7
    if (normalizedDigits.length === NUMERIC_CONSTANTS.PHONE_LENGTH_MIN) {
        return '+7' + normalizedDigits;
    }

    // Если номер начинается с других кодов стран
    if (normalizedDigits.length > NUMERIC_CONSTANTS.PHONE_LENGTH_MIN) {
        return '+' + normalizedDigits;
    }

    // Если номер короче 10 цифр, возвращаем исходный
    return phone;
};

/**
 * Форматирование номера телефона для отображения
 * @param {string} phone - Номер телефона
 * @param {string} format - Формат отображения ('display', 'input', 'storage')
 * @returns {string} - Отформатированный номер
 */
export const formatPhone = (phone, format = 'display') => {
    if (!phone) return '';

    const normalized = normalizePhone(phone);

    if (!normalized) return phone;

    // Извлекаем цифры из нормализованного номера
    const digits = normalized.replace(/\D/g, '');

    switch (format) {
        case 'display':
            // Формат для отображения: +7 (999) 123-45-67
            if (digits.startsWith('7') && digits.length === NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH) {
                const phoneDigits = digits.substring(1);
                return `+7 (${phoneDigits.substring(0, INDEX_OFFSETS.THIRD_CHAR)}) ${phoneDigits.substring(INDEX_OFFSETS.THIRD_CHAR, INDEX_OFFSETS.QUARTERS.Q2_START)}-${phoneDigits.substring(INDEX_OFFSETS.QUARTERS.Q2_START, INDEX_OFFSETS.QUARTERS.Q3_START)}-${phoneDigits.substring(INDEX_OFFSETS.QUARTERS.Q3_START, NUMERIC_CONSTANTS.PHONE_LENGTH_MIN)}`;
            }
            break;

        case 'input':
            // Формат для ввода: +7 (999) 123-45-67
            if (digits.startsWith('7') && digits.length === NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH) {
                const phoneDigits = digits.substring(1);
                return `+7 (${phoneDigits.substring(0, INDEX_OFFSETS.THIRD_CHAR)}) ${phoneDigits.substring(INDEX_OFFSETS.THIRD_CHAR, INDEX_OFFSETS.QUARTERS.Q2_START)}-${phoneDigits.substring(INDEX_OFFSETS.QUARTERS.Q2_START, INDEX_OFFSETS.QUARTERS.Q3_START)}-${phoneDigits.substring(INDEX_OFFSETS.QUARTERS.Q3_START, NUMERIC_CONSTANTS.PHONE_LENGTH_MIN)}`;
            }
            break;

        case 'storage':
            // Формат для хранения: +7XXXXXXXXXX
            return normalized;

        case 'clean':
            // Только цифры: 7XXXXXXXXXX
            return digits;

        default:
            return normalized;
    }

    return normalized;
};

/**
 * Валидация номера телефона
 * @param {string} phone - Номер телефона
 * @returns {Object} - Результат валидации {isValid: boolean, message: string}
 */
export const validatePhone = (phone) => {
    if (!phone) {
        return { isValid: false, message: 'Номер телефона не указан' };
    }

    const digits = phone.replace(/\D/g, '');

    // Проверяем минимальную длину
    if (digits.length < NUMERIC_CONSTANTS.PHONE_LENGTH_MIN) {
        return { isValid: false, message: 'Номер телефона слишком короткий' };
    }

    // Проверяем максимальную длину
    if (digits.length > NUMERIC_CONSTANTS.PHONE_LENGTH_MAX) {
        return { isValid: false, message: 'Номер телефона слишком длинный' };
    }

    // Проверяем российские номера
    if (digits.length === NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH && (digits.startsWith('7') || digits.startsWith('8'))) {
        const phoneDigits = digits.startsWith('8') ? digits.substring(1) : digits.substring(1);

        // Проверяем код оператора (первая цифра после кода страны)
        const operatorCode = phoneDigits.charAt(0);
        if (!['9', '8', '3', '4', '5', '6', '7'].includes(operatorCode)) {
            return { isValid: false, message: 'Неверный код оператора' };
        }

        return { isValid: true, message: 'Номер телефона корректен' };
    }

    // Проверяем номера с 10 цифрами (без кода страны)
    if (digits.length === NUMERIC_CONSTANTS.PHONE_LENGTH_MIN) {
        const operatorCode = digits.charAt(0);
        if (!['9', '8', '3', '4', '5', '6', '7'].includes(operatorCode)) {
            return { isValid: false, message: 'Неверный код оператора' };
        }

        return { isValid: true, message: 'Номер телефона корректен' };
    }

    // Для международных номеров
    if (digits.length >= NUMERIC_CONSTANTS.PHONE_LENGTH_MIN && digits.length <= NUMERIC_CONSTANTS.PHONE_LENGTH_MAX) {
        return { isValid: true, message: 'Номер телефона корректен' };
    }

    return { isValid: false, message: 'Неверный формат номера телефона' };
};

/**
 * Маска для ввода номера телефона
 * @param {string} value - Текущее значение поля
 * @returns {string} - Значение с примененной маской
 */
export const applyPhoneMask = (value) => {
    if (!value) return '';

    // Удаляем все символы, кроме цифр
    const digits = value.replace(/\D/g, '');

    // Если нет цифр, возвращаем пустую строку
    if (!digits) return '';

    // Ограничиваем количество цифр до 11 (для российских номеров)
    const limitedDigits = digits.substring(0, NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH);

    // Если номер начинается с 8, заменяем на 7
    let processedDigits = limitedDigits;
    if (processedDigits.startsWith('8')) {
        processedDigits = '7' + processedDigits.substring(1);
    }

    // Если номер не начинается с 7, добавляем 7 в начало
    if (!processedDigits.startsWith('7') && processedDigits.length <= NUMERIC_CONSTANTS.PHONE_LENGTH_MIN) {
        processedDigits = '7' + processedDigits;
    }

    // Применяем маску постепенно
    let masked = '';

    if (processedDigits.length >= 1) {
        masked = '+7';

        if (processedDigits.length > 1) {
            const operatorCode = processedDigits.substring(1, 4);
            masked += ` (${operatorCode}`;

            if (processedDigits.length >= 4) {
                masked += ')';

                if (processedDigits.length > 4) {
                    const firstPart = processedDigits.substring(4, 7);
                    masked += ` ${firstPart}`;

                    if (processedDigits.length > 7) {
                        const secondPart = processedDigits.substring(7, 9);
                        masked += `-${secondPart}`;

                        if (processedDigits.length > 9) {
                            const thirdPart = processedDigits.substring(9, NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH);
                            masked += `-${thirdPart}`;
                        }
                    }
                }
            }
        }
    }

    return masked;
};

/**
 * Получение типа оператора по номеру телефона
 * @param {string} phone - Номер телефона
 * @returns {string} - Тип оператора
 */
export const getOperatorType = (phone) => {
    const normalized = normalizePhone(phone);
    const digits = normalized.replace(/\D/g, '');

    if (digits.length !== NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH || !digits.startsWith('7')) {
        return 'Неизвестно';
    }

    const operatorCode = digits.substring(1, 4);

    // МТС
    if (['910', '911', '912', '913', '914', '915', '916', '917', '918', '919'].includes(operatorCode)) {
        return 'МТС';
    }

    // Билайн
    if (['903', '905', '906', '909', '951', '952', '953', '954', '955', '956', '957', '958', '959'].includes(operatorCode)) {
        return 'Билайн';
    }

    // МегаФон
    if (['920', '921', '922', '923', '924', '925', '926', '927', '928', '929'].includes(operatorCode)) {
        return 'МегаФон';
    }

    // Теле2
    if (['900', '901', '902', '904', '908', '950', '951', '952', '953', '954', '955', '956', '957', '958', '959'].includes(operatorCode)) {
        return 'Теле2';
    }

    // Yota
    if (['999'].includes(operatorCode)) {
        return 'Yota';
    }

    return 'Другой оператор';
};

/**
 * Проверка, является ли номер мобильным
 * @param {string} phone - Номер телефона
 * @returns {boolean} - true, если номер мобильный
 */
export const isMobilePhone = (phone) => {
    const normalized = normalizePhone(phone);
    const digits = normalized.replace(/\D/g, '');

    if (digits.length !== NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH || !digits.startsWith('7')) {
        return false;
    }

    const operatorCode = digits.charAt(1);
    return operatorCode === '9';
};

/**
 * Конвертация номера из одного формата в другой
 * @param {string} phone - Исходный номер
 * @param {string} fromFormat - Исходный формат
 * @param {string} toFormat - Целевой формат
 * @returns {string} - Конвертированный номер
 */
export const convertPhoneFormat = (phone, fromFormat, toFormat) => {
    // Сначала нормализуем номер
    const normalized = normalizePhone(phone);

    // Затем форматируем в нужный формат
    return formatPhone(normalized, toFormat);
};

// Экспорт для обратной совместимости
export const formatPhoneNumber = formatPhone;
export const formatPhoneForDisplay = (phone) => formatPhone(phone, 'display');

/**
 * Проверка валидности российского номера телефона
 * @param {string} phone - Номер телефона
 * @returns {boolean} - Результат проверки
 */
export const isValidRussianPhone = (phone) => {
    if (!phone) return false;

    // Удаляем все символы кроме цифр
    const cleanPhone = phone.replace(/\D/g, '');

    // Проверяем российские номера:
    // 10 цифр (без кода страны) или 11 цифр начинающиеся с 7 или 8
    if (cleanPhone.length === NUMERIC_CONSTANTS.PHONE_LENGTH_MIN) {
        return true;
    }

    if (cleanPhone.length === NUMERIC_CONSTANTS.PHONE_RUSSIA_LENGTH && /^[78]/.test(cleanPhone)) {
        return true;
    }

    // Проверяем международные номера
    if (cleanPhone.length >= NUMERIC_CONSTANTS.PHONE_LENGTH_MIN &&
        cleanPhone.length <= NUMERIC_CONSTANTS.PHONE_LENGTH_MAX) {
        return true;
    }

    return false;
}; 
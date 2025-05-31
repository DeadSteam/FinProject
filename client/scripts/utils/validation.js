/**
 * Модуль для валидации форм
 */

/**
 * Валидация электронной почты
 * @param {string} email - Адрес электронной почты
 * @returns {boolean} - Результат проверки
 */
export function isValidEmail(email) {
    if (!email) return true; // Пустой email считаем валидным (для необязательных полей)
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    return emailRegex.test(email);
}

/**
 * Валидация номера телефона
 * @param {string} phone - Номер телефона
 * @returns {boolean} - Результат проверки
 */
export function isValidPhoneNumber(phone) {
    if (!phone) return true; // Пустой номер считаем валидным (для необязательных полей)
    
    // Формат +7 (999) 123-45-67
    const strictPhoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
    
    // Более свободный формат для приема разных вариантов ввода
    const loosePhoneRegex = /^(\+7|8)?[\s\-]?\(?(\d{3})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})$/;
    
    return strictPhoneRegex.test(phone) || loosePhoneRegex.test(phone);
}

/**
 * Форматирование номера телефона в стандартный формат
 * @param {string} phone - Номер телефона в произвольном формате
 * @returns {string} - Отформатированный номер телефона
 */
export function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Удаляем все символы, кроме цифр
    const digits = phone.replace(/\D/g, '');
    
    // Проверяем, начинается ли номер с 7 или 8
    const startWith7or8 = /^[78]/.test(digits);
    const phoneDigits = startWith7or8 ? digits.substring(1) : digits;
    
    // Если недостаточно цифр, возвращаем исходную строку
    if (phoneDigits.length < 10) return phone;
    
    // Форматируем номер в формат +7 (999) 123-45-67
    return `+7 (${phoneDigits.substring(0, 3)}) ${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6, 8)}-${phoneDigits.substring(8, 10)}`;
}

/**
 * Показать сообщение об ошибке для поля формы
 * @param {HTMLElement} element - Элемент формы
 * @param {string} message - Сообщение об ошибке
 */
export function showFieldError(element, message) {
    element.classList.add('error');
    
    // Находим или создаем элемент для отображения сообщения об ошибке
    let feedbackElement = element.nextElementSibling;
    if (!feedbackElement || !feedbackElement.classList.contains('error-message')) {
        feedbackElement = document.createElement('div');
        feedbackElement.className = 'error-message';
        element.parentNode.insertBefore(feedbackElement, element.nextSibling);
    }
    
    feedbackElement.textContent = message;
}

/**
 * Очистить сообщения об ошибках в форме
 * @param {HTMLFormElement} form - Форма
 */
export function clearFormErrors(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.classList.remove('error');
        const feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('error-message')) {
            feedback.textContent = '';
        }
    });
}

/**
 * Валидация формы
 * @param {HTMLFormElement} form - Форма
 * @param {Object} rules - Правила валидации
 * @returns {boolean} - Результат валидации
 */
export function validateForm(form, rules) {
    clearFormErrors(form);
    let isValid = true;
    
    // Проходим по всем правилам и проверяем их
    for (const [fieldName, validations] of Object.entries(rules)) {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) continue;
        
        for (const [rule, params] of Object.entries(validations)) {
            switch(rule) {
                case 'required':
                    if (params && field.value.trim() === '') {
                        showFieldError(field, 'Обязательное поле');
                        isValid = false;
                    }
                    break;
                case 'email':
                    if (params && !isValidEmail(field.value)) {
                        showFieldError(field, 'Некорректный формат email');
                        isValid = false;
                    }
                    break;
                case 'phone':
                    if (params && !isValidPhoneNumber(field.value)) {
                        showFieldError(field, 'Некорректный формат телефона');
                        isValid = false;
                    }
                    break;
                case 'minLength':
                    if (field.value.length < params) {
                        showFieldError(field, `Минимальная длина: ${params} символов`);
                        isValid = false;
                    }
                    break;
                case 'match':
                    const matchField = form.querySelector(`[name="${params}"]`);
                    if (matchField && field.value !== matchField.value) {
                        showFieldError(field, 'Значения не совпадают');
                        isValid = false;
                    }
                    break;
            }
        }
    }
    
    return isValid;
} 
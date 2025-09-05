/**
 * Централизованный обработчик ошибок
 * Соблюдение принципа SRP - единственная ответственность: обработка ошибок
 */

import { HTTP_STATUS, APP_CONSTANTS } from '../../config/magic-numbers.js';

export class ErrorHandler {
    constructor() {
        this.errorListeners = new Set();
        this.errorCounts = new Map();
        this.lastErrors = [];
        this.maxLastErrors = 10;
    }

    /**
     * Регистрация слушателя ошибок
     * @param {Function} listener - Функция обработки ошибки
     * @returns {void}
     */
    subscribe(listener) {
        this.errorListeners.add(listener);
    }

    /**
     * Отписка от слушателя ошибок
     * @param {Function} listener - Функция обработки ошибки
     * @returns {void}
     */
    unsubscribe(listener) {
        this.errorListeners.delete(listener);
    }

    /**
     * Обработка ошибки
     * @param {Error} error - Объект ошибки
     * @param {Object} context - Контекст ошибки
     * @returns {void}
     */
    handleError(error, context = {}) {
        const processedError = this.processError(error, context);
        
        // Сохраняем ошибку в историю
        this.saveToHistory(processedError);
        
        // Увеличиваем счетчик ошибок
        this.incrementErrorCount(processedError.type);
        
        // Уведомляем всех слушателей
        this.notifyListeners(processedError);
        
        // Логируем ошибку
        this.logError(processedError);
    }

    /**
     * Обработка и категоризация ошибки
     * @param {Error} error - Исходная ошибка
     * @param {Object} context - Контекст
     * @returns {Object} - Обработанная ошибка
     */
    processError(error, context) {
        const timestamp = new Date().toISOString();
        
        let errorType = 'UNKNOWN';
        let userMessage = 'Произошла неизвестная ошибка';
        let severity = 'error';
        let shouldRetry = false;

        // Анализируем тип ошибки
        if (this.isNetworkError(error)) {
            errorType = 'NETWORK';
            userMessage = 'Проблемы с подключением к серверу';
            severity = 'warning';
            shouldRetry = true;
        } else if (this.isAuthError(error)) {
            errorType = 'AUTH';
            userMessage = 'Ошибка авторизации';
            severity = 'error';
            shouldRetry = false;
        } else if (this.isValidationError(error)) {
            errorType = 'VALIDATION';
            userMessage = this.extractValidationMessage(error);
            severity = 'warning';
            shouldRetry = false;
        } else if (this.isServerError(error)) {
            errorType = 'SERVER';
            userMessage = 'Ошибка сервера';
            severity = 'error';
            shouldRetry = true;
        }

        return {
            id: this.generateErrorId(),
            type: errorType,
            originalError: error,
            message: error.message || 'Unknown error',
            userMessage,
            severity,
            shouldRetry,
            timestamp,
            context,
            stack: error.stack
        };
    }

    /**
     * Проверка на сетевую ошибку
     * @param {Error} error - Ошибка
     * @returns {boolean} - Является ли сетевой ошибкой
     */
    isNetworkError(error) {
        return error.name === 'NetworkError' ||
               error.message.includes('fetch') ||
               error.message.includes('network') ||
               error.code === 'NETWORK_ERROR';
    }

    /**
     * Проверка на ошибку авторизации
     * @param {Error} error - Ошибка
     * @returns {boolean} - Является ли ошибкой авторизации
     */
    isAuthError(error) {
        return error.status === HTTP_STATUS.UNAUTHORIZED ||
               error.status === HTTP_STATUS.FORBIDDEN ||
               error.message.includes('unauthorized') ||
               error.message.includes('forbidden');
    }

    /**
     * Проверка на ошибку валидации
     * @param {Error} error - Ошибка
     * @returns {boolean} - Является ли ошибкой валидации
     */
    isValidationError(error) {
        return error.status === HTTP_STATUS.BAD_REQUEST ||
               error.status === HTTP_STATUS.UNPROCESSABLE_ENTITY ||
               error.name === 'ValidationError';
    }

    /**
     * Проверка на серверную ошибку
     * @param {Error} error - Ошибка
     * @returns {boolean} - Является ли серверной ошибкой
     */
    isServerError(error) {
        return error.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR ||
               error.name === 'ServerError';
    }

    /**
     * Извлечение сообщения из ошибки валидации
     * @param {Error} error - Ошибка валидации
     * @returns {string} - Сообщение для пользователя
     */
    extractValidationMessage(error) {
        if (error.details && Array.isArray(error.details)) {
            return error.details.map(d => d.message).join(', ');
        }
        
        if (error.message) {
            return error.message;
        }
        
        return 'Ошибка валидации данных';
    }

    /**
     * Сохранение ошибки в историю
     * @param {Object} processedError - Обработанная ошибка
     * @returns {void}
     */
    saveToHistory(processedError) {
        this.lastErrors.unshift(processedError);
        
        if (this.lastErrors.length > this.maxLastErrors) {
            this.lastErrors = this.lastErrors.slice(0, this.maxLastErrors);
        }
    }

    /**
     * Увеличение счетчика ошибок
     * @param {string} errorType - Тип ошибки
     * @returns {void}
     */
    incrementErrorCount(errorType) {
        const currentCount = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, currentCount + 1);
    }

    /**
     * Уведомление всех слушателей
     * @param {Object} processedError - Обработанная ошибка
     * @returns {void}
     */
    notifyListeners(processedError) {
        this.errorListeners.forEach(listener => {
            try {
                listener(processedError);
            } catch (error) {
                console.error('Error in error listener:', error);
            }
        });
    }

    /**
     * Логирование ошибки
     * @param {Object} processedError - Обработанная ошибка
     * @returns {void}
     */
    logError(processedError) {
        const logMethod = this.getLogMethod(processedError.severity);
        
        console.group(`🚨 ${processedError.type} Error`);
        console[logMethod]('Message:', processedError.message);
        console[logMethod]('User Message:', processedError.userMessage);
        console[logMethod]('Context:', processedError.context);
        console[logMethod]('Timestamp:', processedError.timestamp);
        
        if (processedError.stack) {
            console[logMethod]('Stack:', processedError.stack);
        }
        
        console.groupEnd();
    }

    /**
     * Получение метода логирования по уровню серьезности
     * @param {string} severity - Уровень серьезности
     * @returns {string} - Метод логирования
     */
    getLogMethod(severity) {
        switch (severity) {
            case 'error': return 'error';
            case 'warning': return 'warn';
            case 'info': return 'info';
            default: return 'log';
        }
    }

    /**
     * Генерация уникального ID ошибки
     * @returns {string} - Уникальный ID
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(APP_CONSTANTS.UUID_PART_LENGTH).substr(2, APP_CONSTANTS.UUID_PART_LENGTH)}`;
    }

    /**
     * Получение статистики ошибок
     * @returns {Object} - Статистика ошибок
     */
    getErrorStatistics() {
        return {
            totalErrors: this.lastErrors.length,
            errorCounts: Object.fromEntries(this.errorCounts),
            lastErrors: this.lastErrors.slice(0, 5), // Последние 5 ошибок
            listeners: this.errorListeners.size
        };
    }

    /**
     * Очистка истории ошибок
     * @returns {void}
     */
    clearHistory() {
        this.lastErrors = [];
        this.errorCounts.clear();
    }
}

// Создаем глобальный экземпляр обработчика ошибок
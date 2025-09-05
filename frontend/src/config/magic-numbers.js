/**
 * Константы для замены magic numbers
 */

// HTTP коды ответов
export const HTTP_STATUS = {
    OK: 200,
    MULTIPLE_CHOICES: 300,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500
};

// Временные интервалы (в миллисекундах)
export const TIME_INTERVALS = {
    DEBOUNCE_DEFAULT: 300,
    NOTIFICATION_DELAY: 1500,
    LOADING_DELAY: 200,
    TIMEOUT_DEFAULT: 30000
};

// Размеры и отступы
export const UI_SIZES = {
    MAGIC_3: 3,
    MAGIC_4: 4,
    MAGIC_5: 5,
    MAGIC_6: 6,
    MAGIC_10: 10,
    MAGIC_20: 20,
    MAGIC_50: 50,
    PAGINATION_SIZE: 10,
    TRUNCATE_LENGTH: 20
};

// Числовые константы для приложения
export const NUMERIC_CONSTANTS = {
    // Диапазоны значений
    PERCENTAGE_MIN: 0,
    PERCENTAGE_MAX: 100,
    CHART_MAX_VALUE: 1000000,
    CHART_MIN_VALUE: 0,
    CURRENCY_MAX_DECIMALS: 2,
    
    // Размеры данных
    PAGE_SIZE_DEFAULT: 20,
    PAGE_SIZE_MAX: 100,
    SEARCH_MIN_LENGTH: 2,
    PASSWORD_MIN_LENGTH: 6,
    NAME_MAX_LENGTH: 50,
    
    // Timeouts и delays (мс)
    API_TIMEOUT: 30000,
    RETRY_DELAY: 1000,
    DEBOUNCE_DELAY: 300,
    
    // HTTP статусы
    HTTP_OK: 200,
    HTTP_CREATED: 201,
    HTTP_UNAUTHORIZED: 401,
    HTTP_FORBIDDEN: 403,
    HTTP_NOT_FOUND: 404,
    HTTP_INTERNAL_ERROR: 500,
    
    // Номера телефонов
    PHONE_LENGTH_MIN: 10,
    PHONE_LENGTH_MAX: 15,
    PHONE_RUSSIA_LENGTH: 11,
    PHONE_DISPLAY_MAX_LENGTH: 18
};

// Индексы и смещения
export const INDEX_OFFSETS = {
    FIRST_CHAR: 0,
    SECOND_CHAR: 1,
    THIRD_CHAR: 2,
    LAST_TWO_DIGITS: 2,
    QUARTERS: {
        Q1_START: 3,
        Q1_END: 4,
        Q2_START: 4,
        Q2_END: 6,
        Q3_START: 7,
        Q3_END: 9,
        Q4_START: 10,
        Q4_END: 12
    }
};

// Размеры экрана (breakpoints)
export const BREAKPOINTS = {
    MOBILE: 576,
    TABLET: 768,
    DESKTOP: 992,
    LARGE_DESKTOP: 1200
};

// Специфичные для приложения константы
export const APP_CONSTANTS = {
    EXCEL_MEMORY_SIZE: 1024,
    RANDOM_ID_LENGTH: 36,
    UUID_PART_LENGTH: 9,
    RETRY_ATTEMPTS: 3,
    MAX_RETRIES: 5
}; 
 
 
 
 
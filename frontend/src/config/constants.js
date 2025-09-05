// Константы для приложения
export const STORAGE_KEYS = {
    TOKEN: 'token',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
    SETTINGS: 'settings'
};

export const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

export const API_TIMEOUTS = {
    REQUEST: 30000,
    LOGIN: 10000
};

export const VALIDATION_RULES = {
    PASSWORD: {
        MIN_LENGTH: 6,
        MAX_LENGTH: 50
    },
    USERNAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 30
    }
};

export const VALIDATION = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_MIN_LENGTH: 6,
    PASSWORD_MAX_LENGTH: 50,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30
};

export const DATE_FORMATS = {
    SHORT: 'short',        // 01.01.2023
    LONG: 'long',          // 1 января 2023
    WITH_TIME: 'withTime', // 01.01.2023 12:30
    ISO: 'iso'             // 2023-01-01
}; 
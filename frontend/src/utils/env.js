// Утилиты окружения для фронтенда

export const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

export const dev = isDevelopment();



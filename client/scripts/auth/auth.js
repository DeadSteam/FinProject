/**
 * Модуль авторизации для работы с API
 */

// Базовый URL API
const API_BASE_URL = `http://${process.env.SERVER_HOST || 'localhost'}:8000/api/v1`;

/**
 * Класс для работы с авторизацией
 */
class AuthService {
    /**
     * Авторизация пользователя
     * @param {string} identifier - Email или номер телефона
     * @param {string} password - Пароль
     * @returns {Promise<Object>} - Данные токенов и информация о пользователе
     */
    async login(identifier, password) {
        try {
            
            // Определяем тип идентификатора
            let requestBody = { password };
            
            if (identifier.includes('@')) {
                // Если содержит @, считаем email
                requestBody.email = identifier;
            } else {
                // Иначе считаем телефоном
                requestBody.phone_number = identifier;
            }
            
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                credentials: 'include' // Для работы с куками
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка ответа от сервера:', errorData);
                throw new Error(errorData.detail || 'Ошибка авторизации');
            }
            
            const data = await response.json();
            
            // Сохраняем токен в localStorage
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('tokenType', data.token_type);
            
            // Получаем данные профиля
            const user = await this.getCurrentUser();
            
            return {
                tokens: data,
                user: user
            };
        } catch (error) {
            console.error('Ошибка при входе:', error);
            throw error;
        }
    }

    
    /**
     * Выход из системы
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include' // Для работы с куками
            });
            
            // Очищаем токены из localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('tokenType');

            return await response.json();
        } catch (error) {
            console.error('Ошибка при выходе:', error);
            // Даже если произошла ошибка, очищаем локальное хранилище
            localStorage.removeItem('accessToken');
            localStorage.removeItem('tokenType');
            throw error;
        }
    }
    
    /**
     * Обновление токена доступа
     * @returns {Promise<Object>} - Новый токен доступа
     */
    async refreshToken() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include' // Для работы с куками
            });
            
            if (!response.ok) {
                console.error('Ошибка обновления токена:', response.status);
                throw new Error('Не удалось обновить токен');
            }
            
            const data = await response.json();
            
            // Сохраняем новый токен в localStorage
            localStorage.setItem('accessToken', data.access_token);
            
            return data;
        } catch (error) {
            console.error('Ошибка при обновлении токена:', error);
            // Возможно, пользователь должен заново авторизоваться
            this.clearAuthData();
            throw error;
        }
    }
    
    /**
     * Получение данных текущего пользователя
     * @returns {Promise<Object>} - Данные пользователя
     */
    async getCurrentUser() {
        try {
            
            // Проверяем наличие токена
            if (!this.isAuthenticated()) {
                console.error('Нет токена для получения данных пользователя');
                return null;
            }
            
            // Делаем запрос к API
            const response = await this.authenticatedRequest(`${API_BASE_URL}/users/me`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                console.error('Ошибка при получении пользователя:', response.status);
                throw new Error(`Ошибка при получении данных пользователя: ${response.status}`);
            }
            
            // Получаем данные пользователя
            let userData;
            try {
                userData = await response.json();
            } catch (jsonError) {
                console.error('Ошибка при парсинге JSON:', jsonError);
                throw new Error('Ошибка при обработке ответа сервера');
            }
            
            // Проверяем наличие информации о роли
            if (!userData.role) {
                console.warn('ПРЕДУПРЕЖДЕНИЕ: Роль отсутствует в данных пользователя!');
                
                // Пытаемся получить роль через специальный эндпоинт
                try {
                    const roleResponse = await this.authenticatedRequest(`${API_BASE_URL}/users/me/role`, {
                        method: 'GET'
                    });
                    
                    if (roleResponse.ok) {
                        const roleData = await roleResponse.json();
                        
                        // Добавляем информацию о роли в данные пользователя
                        if (roleData.role) {
                            userData.role = { name: roleData.role };
                        }
                    }
                } catch (roleError) {
                    console.error('Ошибка при получении дополнительной информации о роли:', roleError);
                    // Не прерываем выполнение, продолжаем с тем, что есть
                }
            }
            return userData;
        } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            throw error;
        }
    }
    
    /**
     * Обновление данных пользователя
     * @param {Object} userData - Новые данные пользователя
     * @returns {Promise<Object>} - Обновленные данные пользователя
     */
    async updateProfile(userData) {
        try {
            const response = await this.authenticatedRequest(`${API_BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка при обновлении профиля:', errorData);
                throw new Error(errorData.detail || 'Ошибка при обновлении профиля');
            }
            
            const updatedUser = await response.json();
            return updatedUser;
        } catch (error) {
            console.error('Ошибка при обновлении профиля:', error);
            throw error;
        }
    }
    
    /**
     * Проверка, авторизован ли пользователь
     * @returns {boolean}
     */
    isAuthenticated() {
        const token = localStorage.getItem('accessToken');
        return !!token;
    }
    
    /**
     * Проверка роли пользователя
     * @param {Array<string>} allowedRoles - Список разрешенных ролей
     * @returns {Promise<boolean>} - Результат проверки
     */
    async hasRole(allowedRoles) {
        if (!this.isAuthenticated()) {
            return false;
        }
        
        try {
            
            // Проверяем из кеша
            const user = await this.getCurrentUser();
            
            if (!user) {
                return false;
            }
            
            // Проверяем роль из данных пользователя
            if (user.role && user.role.name) {
                const userRole = user.role.name;
                const hasAccess = allowedRoles.includes(userRole);
                return hasAccess;
            }
            
            try {
                const response = await this.authenticatedRequest(`${API_BASE_URL}/users/me/role`, {
                    method: 'GET'
                });
                
                // Если получили успешный ответ
                if (response.ok) {
                    const roleData = await response.json();
                    
                    // Проверяем наличие роли в ответе
                    if (roleData && roleData.role) {
                        const userRole = roleData.role;
                        const hasAccess = allowedRoles.includes(userRole);
                        return hasAccess;
                    }
                } else {
                    console.error('Ошибка при запросе роли:', response.status);
                }
            } catch (apiError) {
                console.error('Ошибка при запросе роли через API:', apiError);
            }

            return false;
        } catch (error) {
            console.error('Ошибка при проверке роли:', error);
            return false;
        }
    }
    
    /**
     * Получение заголовка авторизации
     * @returns {string} - Заголовок авторизации
     */
    getAuthHeader() {
        const token = localStorage.getItem('accessToken');
        const tokenType = localStorage.getItem('tokenType') || 'Bearer';
        
        if (!token) {
            return null;
        }
        
        const authHeader = `${tokenType} ${token}`;
        return authHeader;
    }
    
    /**
     * Очистка данных авторизации
     */
    clearAuthData() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenType');
    }
    
    /**
     * Выполнение авторизованного запроса
     * @param {string} url - URL запроса
     * @param {Object} options - Опции запроса
     * @returns {Promise<Response>} - Ответ на запрос
     */
    async authenticatedRequest(url, options = {}) {
        
        if (!this.isAuthenticated()) {
            console.error('Пользователь не авторизован');
            throw new Error('Пользователь не авторизован');
        }
        
        const authHeader = this.getAuthHeader();
        
        if (!authHeader) {
            console.error('Отсутствует токен авторизации');
            throw new Error('Отсутствует токен авторизации');
        }
        
        const headers = {
            ...options.headers,
            Authorization: authHeader,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
        
        try {
            // Добавляем timestamp для предотвращения кэширования
            const timestamp = Date.now();
            const urlWithTimestamp = url.includes('?') 
                ? `${url}&_=${timestamp}` 
                : `${url}?_=${timestamp}`;
                
            let response = await fetch(urlWithTimestamp, { ...options, headers });
            
            // Если получили 401, пробуем обновить токен и повторить запрос
            if (response.status === 401) {
                try {
                    await this.refreshToken();
                    
                    // Повторяем запрос с новым токеном
                    headers.Authorization = this.getAuthHeader();
                    
                    // Обновляем timestamp для второго запроса
                    const newTimestamp = Date.now();
                    const newUrlWithTimestamp = url.includes('?') 
                        ? `${url}&_=${newTimestamp}` 
                        : `${url}?_=${newTimestamp}`;
                        
                    response = await fetch(newUrlWithTimestamp, { ...options, headers });
                } catch (refreshError) {
                    // Если не удалось обновить токен, перенаправляем на страницу входа
                    console.error('Ошибка обновления токена:', refreshError);
                    this.clearAuthData();
                    window.location.href = '/client/pages/login.html'; 
                    throw refreshError;
                }
            }
            
            return response;
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            throw error;
        }
    }
}

// Экспортируем синглтон
const authService = new AuthService();
export default authService; 
/**
 * Модуль авторизации для работы с API
 */

// Базовый URL API
const API_BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Класс для работы с авторизацией
 */
class AuthService {
    /**
     * Авторизация пользователя
     * @param {string} usernameOrEmail - Имя пользователя или email
     * @param {string} password - Пароль
     * @returns {Promise<Object>} - Данные токенов и информация о пользователе
     */
    async login(usernameOrEmail, password) {
        try {
            console.log(`Попытка входа с ${usernameOrEmail} и паролем ${password}`);
            
            // Определяем, что передано - email или username
            const isEmail = usernameOrEmail.includes('@');
            
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [isEmail ? 'email' : 'username']: usernameOrEmail,
                    password: password
                }),
                credentials: 'include' // Для работы с куками
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка ответа от сервера:', errorData);
                throw new Error(errorData.detail || 'Ошибка авторизации');
            }
            
            const data = await response.json();
            console.log('Данные токенов:', data);
            
            // Сохраняем токен в localStorage
            localStorage.setItem('accessToken', data.access_token);
            localStorage.setItem('tokenType', data.token_type);
            
            // Получаем данные профиля
            const user = await this.getCurrentUser();
            console.log('Данные пользователя после входа:', user);
            
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
     * Регистрация нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} - Данные созданного пользователя
     */
    async register(userData) {
        try {
            console.log('Регистрация пользователя:', userData);
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Ошибка регистрации:', errorData);
                throw new Error(errorData.detail || 'Ошибка регистрации');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            throw error;
        }
    }
    
    /**
     * Выход из системы
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            console.log('Выполняем выход из системы...');
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include' // Для работы с куками
            });
            
            // Очищаем токены из localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('tokenType');
            
            console.log('Выход выполнен успешно');
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
            console.log('Обновление токена...');
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include' // Для работы с куками
            });
            
            if (!response.ok) {
                console.error('Ошибка обновления токена:', response.status);
                throw new Error('Не удалось обновить токен');
            }
            
            const data = await response.json();
            console.log('Токен обновлен:', data);
            
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
     * Запрос на сброс пароля
     * @param {string} email - Email пользователя
     * @returns {Promise<Object>} - Результат запроса
     */
    async requestPasswordReset(email) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка при запросе сброса пароля');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Ошибка при запросе сброса пароля:', error);
            throw error;
        }
    }
    
    /**
     * Получение данных текущего пользователя
     * @returns {Promise<Object>} - Данные пользователя
     */
    async getCurrentUser() {
        try {
            console.log('Запрос данных текущего пользователя...');
            console.log('Токен авторизации:', this.getAuthHeader());
            
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
                console.log('Данные пользователя получены:', userData);
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
                        console.log('Данные роли получены дополнительно:', roleData);
                        
                        // Добавляем информацию о роли в данные пользователя
                        if (roleData.role) {
                            userData.role = { name: roleData.role };
                            console.log('Данные пользователя дополнены информацией о роли:', userData);
                        }
                    }
                } catch (roleError) {
                    console.error('Ошибка при получении дополнительной информации о роли:', roleError);
                    // Не прерываем выполнение, продолжаем с тем, что есть
                }
            } else {
                console.log('Роль пользователя из ответа API:', userData.role);
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
            
            return await response.json();
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
        console.log('Проверка авторизации, токен:', token);
        return !!token;
    }
    
    /**
     * Проверка роли пользователя
     * @param {Array<string>} allowedRoles - Список разрешенных ролей
     * @returns {Promise<boolean>} - Результат проверки
     */
    async hasRole(allowedRoles) {
        if (!this.isAuthenticated()) {
            console.log('Пользователь не авторизован при проверке роли');
            return false;
        }
        
        try {
            console.log('Проверка ролей пользователя:', allowedRoles);
            
            // Проверяем из кеша
            const user = await this.getCurrentUser();
            console.log('Данные пользователя для проверки роли:', user);
            
            if (!user) {
                console.log('Нет данных пользователя');
                return false;
            }
            
            // Проверяем роль из данных пользователя
            if (user.role && user.role.name) {
                const userRole = user.role.name;
                const hasAccess = allowedRoles.includes(userRole);
                console.log(`Проверка роли из данных пользователя: ${userRole}, разрешенные роли: [${allowedRoles.join(', ')}], доступ: ${hasAccess}`);
                return hasAccess;
            }
            
            // Если в данных пользователя нет роли, пробуем запросить напрямую
            console.log('Роль не найдена в данных пользователя, запрашиваем через API...');
            
            try {
                const response = await this.authenticatedRequest(`${API_BASE_URL}/users/me/role`, {
                    method: 'GET'
                });
                
                // Если получили успешный ответ
                if (response.ok) {
                    const roleData = await response.json();
                    console.log('Данные роли из API:', roleData);
                    
                    // Проверяем наличие роли в ответе
                    if (roleData && roleData.role) {
                        const userRole = roleData.role;
                        const hasAccess = allowedRoles.includes(userRole);
                        console.log(`Проверка роли из API: ${userRole}, разрешенные роли: [${allowedRoles.join(', ')}], доступ: ${hasAccess}`);
                        return hasAccess;
                    }
                } else {
                    console.error('Ошибка при запросе роли:', response.status);
                }
            } catch (apiError) {
                console.error('Ошибка при запросе роли через API:', apiError);
            }
            
            // Если не удалось определить роль ни одним из способов
            console.log('Роль пользователя не определена');
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
            console.log('Токен отсутствует');
            return null;
        }
        
        const authHeader = `${tokenType} ${token}`;
        console.log('Заголовок авторизации:', authHeader);
        return authHeader;
    }
    
    /**
     * Очистка данных авторизации
     */
    clearAuthData() {
        console.log('Очистка данных авторизации');
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
        console.log(`Выполнение авторизованного запроса к ${url}`);
        
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
        
        console.log('Заголовки запроса:', headers);
        
        try {
            // Добавляем timestamp для предотвращения кэширования
            const timestamp = Date.now();
            const urlWithTimestamp = url.includes('?') 
                ? `${url}&_=${timestamp}` 
                : `${url}?_=${timestamp}`;
                
            let response = await fetch(urlWithTimestamp, { ...options, headers });
            console.log('Получен ответ:', response.status);
            
            // Если получили 401, пробуем обновить токен и повторить запрос
            if (response.status === 401) {
                console.log('Получен код 401, обновляем токен...');
                try {
                    await this.refreshToken();
                    
                    // Повторяем запрос с новым токеном
                    headers.Authorization = this.getAuthHeader();
                    console.log('Повторный запрос с новым токеном');
                    
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
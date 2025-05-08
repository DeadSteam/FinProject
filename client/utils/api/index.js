// Базовый API клиент для взаимодействия с сервером
class ApiClient {
    constructor() {
        this.baseUrl = 'http://localhost:8000/api/v1';
        this.headers = {
            'Content-Type': 'application/json'
        };
        this.preventCache = true; // Флаг для предотвращения кэширования
    }

    // Добавление токена авторизации
    setAuthToken(token) {
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.headers['Authorization'];
        }
    }

    // Получение токена из localStorage
    getAuthToken() {
        return localStorage.getItem('accessToken');
    }
    
    // Добавление параметра для предотвращения кэширования
    addNoCacheParam(url) {
        if (!this.preventCache) return url;
        
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_=${Date.now()}`;
    }

    // Базовый метод для выполнения fetch запросов
    async _fetchRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        if (token) {
            this.setAuthToken(token);
        }

        const url = this.addNoCacheParam(`${this.baseUrl}${endpoint}`);
        const fetchOptions = {
            ...options,
            headers: this.headers,
            mode: 'cors' // Явно указываем режим CORS
        };

        try {
            console.log(`Выполняем запрос к ${url}`, fetchOptions);
            const response = await fetch(url, fetchOptions);
            
            // Проверяем статус 401 - Неавторизован
            if (response.status === 401) {
                console.error('Ошибка авторизации (401). Перенаправляем на страницу входа.');
                // Очищаем токен из localStorage
                localStorage.removeItem('accessToken');
                localStorage.removeItem('tokenType');
                
                // Перенаправляем на страницу входа только если это не страница входа
                if (!window.location.href.includes('/pages/login.html')) {
                    window.location.href = '/client/pages/login.html';
                }
                throw new Error('Ошибка авторизации');
            }
            
            // Если ответ не успешный, выбрасываем ошибку
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('Ошибка API:', errorData);
                throw new Error(errorData?.detail || `Ошибка: ${response.status} ${response.statusText}`);
            }
            
            // Проверяем наличие контента в ответе
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET запрос
    async get(endpoint, queryParams = {}) {
        const queryString = new URLSearchParams(queryParams).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this._fetchRequest(url, { method: 'GET' });
    }

    // POST запрос
    async post(endpoint, data = {}) {
        return this._fetchRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT запрос
    async put(endpoint, data = {}) {
        return this._fetchRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE запрос
    async delete(endpoint) {
        return this._fetchRequest(endpoint, { method: 'DELETE' });
    }
}

// Экспортируем экземпляр API клиента
export const apiClient = new ApiClient(); 
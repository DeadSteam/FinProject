/**
 * Скрипт для проверки авторизации и ролей
 */

// Базовый URL API
const API_BASE_URL = `http://${process.env.SERVER_HOST || 'localhost'}:8000/api/v1`;

/**
 * Получаем токен авторизации
 */
function getAuthHeader() {
    const token = localStorage.getItem('accessToken');
    const tokenType = localStorage.getItem('tokenType') || 'Bearer';
    
    if (!token) {
        return null;
    }
    
    const authHeader = `${tokenType} ${token}`;
    return authHeader;
}

/**
 * Получаем текущего пользователя
 */
async function getCurrentUser() {
    const authHeader = getAuthHeader();
    if (!authHeader) {
        console.error('Нет токена авторизации');
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка получения пользователя:', errorData);
            throw new Error(errorData.detail || 'Ошибка получения пользователя');
        }
        
        const userData = await response.json();
        
        return userData;
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        return null;
    }
}

/**
 * Получаем роль пользователя
 */
async function getUserRole() {
    const authHeader = getAuthHeader();
    if (!authHeader) {
        console.error('Нет токена авторизации');
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/me/role`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка получения роли:', errorData);
            throw new Error(errorData.detail || 'Ошибка получения роли пользователя');
        }
        
        const roleData = await response.json();
        
        return roleData;
    } catch (error) {
        console.error('Ошибка при получении роли пользователя:', error);
        return null;
    }
}

/**
 * Получаем список всех ролей (для администраторов)
 */
async function getAllRoles() {
    const authHeader = getAuthHeader();
    if (!authHeader) {
        console.error('Нет токена авторизации');
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/roles`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка получения ролей:', errorData);
            throw new Error(errorData.detail || 'Ошибка получения списка ролей');
        }
        
        const rolesData = await response.json();
        
        return rolesData;
    } catch (error) {
        console.error('Ошибка при получении списка ролей:', error);
        return null;
    }
}

/**
 * Проверяем роль пользователя
 */
async function checkUserRole(allowedRoles = ['admin', 'manager']) {
    const roleData = await getUserRole();
    
    if (!roleData || !roleData.role) {
        console.error('Роль пользователя не определена');
        return false;
    }
    
    // Получаем строковое значение роли
    const userRole = roleData.role;
    
    const hasAccess = allowedRoles.includes(userRole);
    
    return hasAccess;
}

// Экспорт функций
export {
    getCurrentUser,
    getUserRole,
    getAllRoles,
    checkUserRole
}; 
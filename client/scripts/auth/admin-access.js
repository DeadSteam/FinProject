/**
 * Модуль для проверки прав доступа к админпанели
 */
import authService from './auth.js';

/**
 * Проверка прав доступа к админпанели
 * @param {Array<string>} allowedRoles - Список разрешенных ролей
 * @returns {Promise<Object>} - Информация о пользователе
 */
export async function checkAdminAccess(allowedRoles = ['admin', 'manager']) {
    try {
        
        // Проверяем, авторизован ли пользователь
        if (!authService.isAuthenticated()) {
            window.location.href = '/client/pages/login.html';
            return null;
        }
        
        // Проверяем роль пользователя
        const user = await authService.getCurrentUser();
        
        const hasAccess = await authService.hasRole(allowedRoles);
        
        if (!hasAccess) {
            alert('У вас нет прав доступа к админпанели. Вы будете перенаправлены на главную страницу.');
            window.location.href = '/client/index.html';
            return null;
        }
        
        // Если все проверки прошли успешно, возвращаем пользовательские данные
        return user;
    } catch (error) {
        console.error('Ошибка при проверке прав доступа:', error);
        window.location.href = '/client/pages/login.html';
        return null;
    }
}

/**
 * Обновление информации о пользователе в интерфейсе админпанели
 * @param {Object} user - Данные пользователя
 */
export function updateAdminUserInfo(user) {
    if (!user) return;
    
    const userAvatar = document.querySelector('.avatar-inner');
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    
    if (userAvatar && user.username) {
        userAvatar.textContent = user.username.substring(0, 2).toUpperCase();
    }
    
    if (userName) {
        userName.textContent = user.username || 'Пользователь';
    }
    
    if (userRole && user.role) {
        userRole.textContent = user.role.name || 'Пользователь';
    }
    
    // Добавляем обработчик для кнопки выхода
    const logoutButton = document.querySelector('.user-dropdown-item:last-child');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await authService.logout();
                window.location.href = '/client/pages/login.html';
            } catch (error) {
                console.error('Ошибка при выходе из системы:', error);
                window.location.href = '/client/pages/login.html';
            }
        });
    }
}

/**
 * Инициализация доступа к админпанели
 * @param {Array<string>} allowedRoles - Список разрешенных ролей
 */
export async function initAdminAccess(allowedRoles) {
    const user = await checkAdminAccess(allowedRoles);
    if (user) {
        updateAdminUserInfo(user);
    }
}

// Экспортируем authService для использования в компонентах админпанели
export { authService }; 
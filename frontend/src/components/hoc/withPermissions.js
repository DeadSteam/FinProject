import React from 'react';

import { usePermissions } from '../../hooks';

/**
 * HOC для проверки прав доступа
 * Ответственность: авторизация и контроль доступа к компонентам
 * Соблюдает принципы SRP и OCP - легко расширяется для новых ролей
 * 
 * @param {React.Component} WrappedComponent - оборачиваемый компонент
 * @param {object} options - настройки проверки прав
 * @returns {React.Component} компонент с проверкой прав
 */
const withPermissions = (WrappedComponent, options = {}) => {
    const {
        requiredRoles = [],
        requiredPermissions = [],
        fallbackComponent: FallbackComponent = DefaultAccessDenied,
        checkAllRoles = false, // true = все роли, false = хотя бы одна
        checkAllPermissions = false, // true = все права, false = хотя бы одно
        redirectTo = null,
        customCheck = null // Функция для кастомной проверки
    } = options;

    const WithPermissionsComponent = (props) => {
        const { 
            hasRole, 
            hasPermission, 
            canAccess, 
            isAdmin, 
            isModerator,
            userRoles,
            userPermissions
        } = usePermissions();

        // Кастомная проверка (приоритет)
        if (customCheck && typeof customCheck === 'function') {
            const customResult = customCheck({
                hasRole,
                hasPermission,
                canAccess,
                isAdmin,
                isModerator,
                userRoles,
                userPermissions,
                props
            });

            if (!customResult) {
                return <FallbackComponent {...props} requiredRoles={requiredRoles} requiredPermissions={requiredPermissions} />;
            }
        }

        // Проверка ролей
        if (requiredRoles.length > 0) {
            const roleCheck = checkAllRoles
                ? requiredRoles.every(role => hasRole(role))
                : requiredRoles.some(role => hasRole(role));

            if (!roleCheck) {
                return <FallbackComponent {...props} requiredRoles={requiredRoles} requiredPermissions={requiredPermissions} />;
            }
        }

        // Проверка разрешений
        if (requiredPermissions.length > 0) {
            const permissionCheck = checkAllPermissions
                ? requiredPermissions.every(permission => {
                    if (typeof permission === 'string') {
                        return hasPermission(permission);
                    }
                    if (typeof permission === 'object') {
                        return canAccess(permission.resource, permission.action);
                    }
                    return false;
                })
                : requiredPermissions.some(permission => {
                    if (typeof permission === 'string') {
                        return hasPermission(permission);
                    }
                    if (typeof permission === 'object') {
                        return canAccess(permission.resource, permission.action);
                    }
                    return false;
                });

            if (!permissionCheck) {
                return <FallbackComponent {...props} requiredRoles={requiredRoles} requiredPermissions={requiredPermissions} />;
            }
        }

        // Если все проверки пройдены, рендерим оригинальный компонент
        return <WrappedComponent {...props} />;
    };

    // Копируем displayName для удобства отладки
    WithPermissionsComponent.displayName = `withPermissions(${WrappedComponent.displayName || WrappedComponent.name})`;

    // Копируем статические методы и свойства
    Object.keys(WrappedComponent).forEach(key => {
        if (key !== 'displayName' && key !== 'name') {
            WithPermissionsComponent[key] = WrappedComponent[key];
        }
    });

    return WithPermissionsComponent;
};

/**
 * Компонент по умолчанию для отображения ошибки доступа
 */
const DefaultAccessDenied = ({ requiredRoles, requiredPermissions }) => (
    <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '0.375rem',
        color: '#856404',
        margin: '1rem'
    }}>
        <h3>Доступ запрещен</h3>
        <p>У вас недостаточно прав для просмотра этого контента.</p>
        {requiredRoles.length > 0 && (
            <p><strong>Требуемые роли:</strong> {requiredRoles.join(', ')}</p>
        )}
        {requiredPermissions.length > 0 && (
            <p><strong>Требуемые права:</strong> {requiredPermissions.map(p => 
                typeof p === 'string' ? p : `${p.resource}:${p.action}`
            ).join(', ')}</p>
        )}
    </div>
);

/**
 * Предопределенные HOC для частых случаев
 */

// Только администраторы
export const withAdminOnly = (WrappedComponent, options = {}) => 
    withPermissions(WrappedComponent, {
        ...options,
        customCheck: ({ isAdmin }) => isAdmin
    });

// Администраторы и модераторы
export const withModeratorAccess = (WrappedComponent, options = {}) =>
    withPermissions(WrappedComponent, {
        ...options,
        customCheck: ({ isAdmin, isModerator }) => isAdmin || isModerator
    });

// Доступ к финансовым данным
export const withFinanceAccess = (WrappedComponent, options = {}) =>
    withPermissions(WrappedComponent, {
        ...options,
        requiredPermissions: [{ resource: 'finance', action: 'read' }],
        ...options
    });

// Административный доступ к финансам
export const withFinanceAdminAccess = (WrappedComponent, options = {}) =>
    withPermissions(WrappedComponent, {
        ...options,
        requiredPermissions: [{ resource: 'finance', action: 'write' }],
        ...options
    });

/**
 * Утилиты для создания кастомных проверок
 */
export const createPermissionChecker = (checkFunction) => (WrappedComponent, options = {}) =>
    withPermissions(WrappedComponent, {
        ...options,
        customCheck: checkFunction
    });

export default withPermissions; 
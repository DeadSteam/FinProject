import { useMemo, useCallback } from 'react';

import { useAuthUser, useAuthStatus } from '../context/auth/index.js';

/**
 * usePermissions - Универсальный хук для проверки прав доступа
 * 
 * Поддерживает:
 * - Проверка ролей пользователя
 * - Проверка конкретных разрешений
 * - Иерархия ролей
 * - Условные разрешения
 * - Кэширование результатов
 * 
 * @param {Object} options - Опции конфигурации
 * @returns {Object} - Методы проверки прав
 */
export function usePermissions(options = {}) {
  const {
    // Конфигурация ролей
    roleHierarchy = {
      admin: ['manager', 'user'],
      manager: ['user'],
      user: []
    },
    
    // Карта разрешений по ролям
    rolePermissions = {
      admin: ['*'], // Все разрешения
      manager: ['read:users', 'write:categories', 'read:reports'],
      user: ['read:own', 'write:own']
    },
    
    // Кастомные проверки
    customChecks = {},
    
    // Опции
    strictMode = false, // Строгий режим (требует точного совпадения)
    cacheResults = true,
  } = options;

  const user = useAuthUser();
  const { isAuthenticated } = useAuthStatus();

  // Получаем роли пользователя
  const userRoles = useMemo(() => {
    if (!user || !isAuthenticated) return [];
    
    // Поддерживаем разные форматы ролей
    if (Array.isArray(user.roles)) {
      return user.roles;
    }
    
    if (typeof user.role === 'string') {
      return [user.role];
    }
    
    // Поддерживаем роль как объект с полем name
    if (user.role && typeof user.role === 'object' && user.role.name) {
      return [user.role.name];
    }
    
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions;
    }
    
    return [];
  }, [user, isAuthenticated]);

  // Получаем все роли с учетом иерархии
  const effectiveRoles = useMemo(() => {
    if (!userRoles.length) return [];
    
    const roles = new Set(userRoles);
    
    // Добавляем роли из иерархии
    userRoles.forEach(role => {
      const inheritedRoles = roleHierarchy[role] || [];
      inheritedRoles.forEach(inheritedRole => roles.add(inheritedRole));
    });
    
    return Array.from(roles);
  }, [userRoles, roleHierarchy]);

  // Получаем все разрешения пользователя
  const userPermissions = useMemo(() => {
    const permissions = new Set();
    
    effectiveRoles.forEach(role => {
      const rolePerms = rolePermissions[role] || [];
      rolePerms.forEach(perm => permissions.add(perm));
    });
    
    // Добавляем прямые разрешения пользователя
    if (user?.permissions && Array.isArray(user.permissions)) {
      user.permissions.forEach(perm => permissions.add(perm));
    }
    
    return Array.from(permissions);
  }, [effectiveRoles, rolePermissions, user]);

  // Проверка роли
  const hasRole = useCallback((role) => {
    if (!isAuthenticated || !role) return false;
    
    if (Array.isArray(role)) {
      return role.some(r => effectiveRoles.includes(r));
    }
    
    return effectiveRoles.includes(role);
  }, [isAuthenticated, effectiveRoles]);

  // Проверка разрешения
  const hasPermission = useCallback((permission) => {
    if (!isAuthenticated || !permission) return false;
    
    // Если есть wildcard разрешение
    if (userPermissions.includes('*')) return true;
    
    if (Array.isArray(permission)) {
      return permission.some(p => checkSinglePermission(p, userPermissions, strictMode));
    }
    
    return checkSinglePermission(permission, userPermissions, strictMode);
  }, [isAuthenticated, userPermissions, strictMode]);

  // Проверка любого из условий
  const hasAnyPermission = useCallback((permissions) => {
    if (!Array.isArray(permissions)) return hasPermission(permissions);
    
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  // Проверка всех условий
  const hasAllPermissions = useCallback((permissions) => {
    if (!Array.isArray(permissions)) return hasPermission(permissions);
    
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  // Проверка владения ресурсом
  const canAccess = useCallback((resource, action = 'read', context = {}) => {
    if (!isAuthenticated) return false;
    
    // Проверяем разрешение в формате "action:resource"
    const permission = `${action}:${resource}`;
    if (hasPermission(permission)) return true;
    
    // Проверяем владение ресурсом
    if (resource === 'own' || context.ownerId === user?.id) {
      return hasPermission(`${action}:own`);
    }
    
    // Кастомные проверки
    const customKey = `${action}:${resource}`;
    if (customChecks[customKey]) {
      return customChecks[customKey](user, context);
    }
    
    return false;
  }, [isAuthenticated, hasPermission, customChecks, user]);

  // Проверка на админа
  const isAdmin = useMemo(() => {
    return hasRole('admin') || hasPermission('*');
  }, [hasRole, hasPermission]);

  // Проверка на модератора
  const isModerator = useMemo(() => {
    return hasRole(['admin', 'manager', 'moderator']);
  }, [hasRole]);

  // Получение разрешенных действий для ресурса
  const getAllowedActions = useCallback((resource) => {
    const actions = ['create', 'read', 'update', 'delete'];
    
    return actions.filter(action => {
      const permission = `${action}:${resource}`;
      return hasPermission(permission);
    });
  }, [hasPermission]);

  // Фильтрация списка по правам доступа
  const filterByPermissions = useCallback((items, permissionKey = 'permission') => {
    if (!Array.isArray(items)) return [];
    
    return items.filter(item => {
      const requiredPermission = item[permissionKey];
      if (!requiredPermission) return true;
      
      return hasPermission(requiredPermission);
    });
  }, [hasPermission]);

  // HOC для защиты компонентов
  const withPermission = useCallback((permission, fallbackComponent = null) => {
    return (WrappedComponent) => {
      return function PermissionProtectedComponent(props) {
        if (!hasPermission(permission)) {
          return fallbackComponent;
        }
        
        return <WrappedComponent {...props} />;
      };
    };
  }, [hasPermission]);

  // Утилиты для UI
  const getPermissionProps = useCallback((permission) => {
    const hasAccess = hasPermission(permission);
    
    return {
      disabled: !hasAccess,
      hidden: !hasAccess,
      'aria-disabled': !hasAccess,
      'data-permission': permission,
      'data-has-access': hasAccess,
    };
  }, [hasPermission]);

  return {
    // Данные пользователя
    user,
    userRoles,
    effectiveRoles,
    userPermissions,
    isAuthenticated,
    
    // Проверки ролей
    hasRole,
    isAdmin,
    isModerator,
    
    // Проверки разрешений
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    
    // Утилиты
    getAllowedActions,
    filterByPermissions,
    withPermission,
    getPermissionProps,
    
    // Computed флаги для часто используемых проверок
    canCreateUsers: hasPermission('create:users'),
    canEditUsers: hasPermission('update:users'),
    canDeleteUsers: hasPermission('delete:users'),
    canViewReports: hasPermission('read:reports'),
    canManageCategories: hasPermission('write:categories'),
    canAccessAdmin: hasRole(['admin', 'manager']),
    
    // Debugging
    debug: {
      roles: userRoles,
      effectiveRoles,
      permissions: userPermissions,
      roleHierarchy,
      rolePermissions,
    }
  };
}

/**
 * useRoleCheck - Упрощенный хук для проверки ролей
 * 
 * @param {string|Array} requiredRoles - Требуемые роли
 * @returns {boolean} - Есть ли доступ
 */
export function useRoleCheck(requiredRoles) {
  const { hasRole } = usePermissions();
  
  return hasRole(requiredRoles);
}

/**
 * usePermissionCheck - Упрощенный хук для проверки разрешений
 * 
 * @param {string|Array} requiredPermissions - Требуемые разрешения
 * @returns {boolean} - Есть ли доступ
 */
export function usePermissionCheck(requiredPermissions) {
  const { hasPermission } = usePermissions();
  
  return hasPermission(requiredPermissions);
}

/**
 * useResourceAccess - Хук для проверки доступа к ресурсу
 * 
 * @param {string} resource - Название ресурса
 * @param {Object} context - Контекст (например, ownerId)
 * @returns {Object} - Объект с флагами доступа
 */
export function useResourceAccess(resource, context = {}) {
  const { canAccess } = usePermissions();
  
  const canCreate = canAccess(resource, 'create', context);
  const canRead = canAccess(resource, 'read', context);
  const canUpdate = canAccess(resource, 'update', context);
  const canDelete = canAccess(resource, 'delete', context);
  
  return {
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canModify: canUpdate || canDelete,
    hasAnyAccess: canCreate || canRead || canUpdate || canDelete,
    hasFullAccess: canCreate && canRead && canUpdate && canDelete,
  };
}

/**
 * useConditionalPermissions - Хук для условных разрешений
 * 
 * @param {Object} conditions - Условия для проверки
 * @returns {Object} - Результаты проверок
 */
export function useConditionalPermissions(conditions = {}) {
  const { user, hasPermission, hasRole } = usePermissions();
  
  const results = useMemo(() => {
    const computed = {};
    
    Object.entries(conditions).forEach(([key, condition]) => {
      if (typeof condition === 'function') {
        computed[key] = condition(user);
      } else if (typeof condition === 'object') {
        const { role, permission, custom } = condition;
        
        let result = true;
        
        if (role) {
          result = result && hasRole(role);
        }
        
        if (permission) {
          result = result && hasPermission(permission);
        }
        
        if (custom && typeof custom === 'function') {
          result = result && custom(user);
        }
        
        computed[key] = result;
      } else {
        computed[key] = hasPermission(condition);
      }
    });
    
    return computed;
  }, [conditions, user, hasPermission, hasRole]);
  
  return results;
}

// Утилиты

/**
 * Проверка одного разрешения
 */
function checkSinglePermission(permission, userPermissions, strictMode) {
  if (userPermissions.includes(permission)) return true;
  
  if (strictMode) return false;
  
  // Wildcard проверки (например, "read:*" разрешает "read:users")
  const wildcardPermissions = userPermissions.filter(p => p.includes('*'));
  
  return wildcardPermissions.some(wildcard => {
    const pattern = wildcard.replace('*', '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(permission);
  });
} 
 
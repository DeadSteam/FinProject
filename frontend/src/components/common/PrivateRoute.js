import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStatus, useRoleCheck } from '../../context/auth';

import LoadingSpinner from './LoadingSpinner.js';

/**
 * Phase 10 Task 10.3: React.memo оптимизация
 * Компонент для защищенных маршрутов
 * @param {Object} props - Пропсы компонента
 * @param {React.ReactNode} props.children - Дочерние компоненты
 * @param {string} props.requiredRole - Требуемая роль для доступа
 * @returns {React.ReactElement} - Защищенный маршрут или редирект
 */
const PrivateRoute = React.memo(({ children, requiredRole = null }) => {
    const { isAuthenticated, isLoading } = useAuthStatus();
    const hasRole = useRoleCheck();

    // Показываем загрузку пока проверяем авторизацию
    if (isLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                <LoadingSpinner />
            </div>
        );
    }

    // Если не авторизован, перенаправляем на логин
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Если требуется определенная роль, проверяем её (admin имеет доступ везде)
    if (requiredRole && !hasRole(requiredRole)) {
        return <Navigate to="/" replace />;
    }

    return children;
});

export default PrivateRoute; 
 
 
 
 
 
 
 
 
 
 

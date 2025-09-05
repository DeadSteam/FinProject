import React, { useState, useEffect, useMemo } from 'react';
import styles from './LiveUserPresence.module.css';

/**
 * Компонент для отображения присутствия пользователей в реальном времени
 * 
 * Возможности:
 * - Показ списка онлайн пользователей
 * - Индикаторы активности (редактирование, просмотр)
 * - Курсоры других пользователей
 * - Уведомления о входе/выходе пользователей
 */
const LiveUserPresence = ({
    currentUser,
    onlineUsers = [],
    userActivities = {},
    showCursors = true,
    showNotifications = true,
    maxVisibleUsers = 5,
    onUserClick,
    className = ''
}) => {
    const [notifications, setNotifications] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [previousUsers, setPreviousUsers] = useState(new Set());

    // Отслеживание изменений в списке пользователей для уведомлений
    useEffect(() => {
        if (!showNotifications) return;

        const currentUserIds = new Set(onlineUsers.map(user => user.id));
        
        // Находим новых пользователей
        const newUsers = onlineUsers.filter(user => 
            !previousUsers.has(user.id) && user.id !== currentUser?.id
        );
        
        // Находим покинувших пользователей
        const leftUserIds = Array.from(previousUsers).filter(userId => 
            !currentUserIds.has(userId) && userId !== currentUser?.id
        );

        // Добавляем уведомления о новых пользователях
        newUsers.forEach(user => {
            const notification = {
                id: `join_${user.id}_${Date.now()}`,
                type: 'join',
                user,
                timestamp: Date.now()
            };
            
            setNotifications(prev => [...prev, notification]);
            
            // Автоматически убираем уведомление через 3 секунды
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 3000);
        });

        // Добавляем уведомления о покинувших пользователях
        leftUserIds.forEach(userId => {
            const user = { id: userId, username: 'Unknown' }; // Минимальная информация
            const notification = {
                id: `leave_${userId}_${Date.now()}`,
                type: 'leave',
                user,
                timestamp: Date.now()
            };
            
            setNotifications(prev => [...prev, notification]);
            
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 3000);
        });

        setPreviousUsers(currentUserIds);
    }, [onlineUsers, showNotifications, previousUsers, currentUser]);

    // Группировка пользователей по активности
    const usersByActivity = useMemo(() => {
        const groups = {
            editing: [],
            viewing: [],
            idle: []
        };

        onlineUsers.forEach(user => {
            if (user.id === currentUser?.id) return;
            
            const activity = userActivities[user.id];
            if (activity?.type === 'editing') {
                groups.editing.push(user);
            } else if (activity?.type === 'viewing') {
                groups.viewing.push(user);
            } else {
                groups.idle.push(user);
            }
        });

        return groups;
    }, [onlineUsers, userActivities, currentUser]);

    const totalOtherUsers = onlineUsers.length - (currentUser ? 1 : 0);

    const getActivityIcon = (activity) => {
        switch (activity?.type) {
            case 'editing':
                return (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#4caf50">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                );
            case 'viewing':
                return (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#2196f3">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                );
            default:
                return (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#9e9e9e">
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                );
        }
    };

    const getActivityDescription = (user, activity) => {
        if (!activity) return 'В сети';
        
        switch (activity.type) {
            case 'editing':
                return `Редактирует ${activity.target || 'данные'}`;
            case 'viewing':
                return `Просматривает ${activity.target || 'страницу'}`;
            default:
                return 'В сети';
        }
    };

    const getUserInitials = (user) => {
        const name = user.username || user.name || 'Anonymous';
        return name.substring(0, 2).toUpperCase();
    };

    const getUserColor = (userId) => {
        // Генерируем консистентный цвет для пользователя
        const colors = [
            '#f44336', '#e91e63', '#9c27b0', '#673ab7',
            '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
            '#009688', '#4caf50', '#8bc34a', '#cddc39',
            '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
        ];
        
        const hash = userId.toString().split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    };

    const visibleUsers = [...usersByActivity.editing, ...usersByActivity.viewing, ...usersByActivity.idle]
        .slice(0, maxVisibleUsers);
    
    const hiddenUsersCount = totalOtherUsers - visibleUsers.length;

    return (
        <div className={`${styles.liveUserPresence} ${className}`}>
            {/* Основной индикатор */}
            <div className={styles.presenceIndicator}>
                {totalOtherUsers > 0 ? (
                    <>
                        {/* Аватары пользователей */}
                        <div className={styles.userAvatars}>
                            {visibleUsers.map(user => (
                                <div
                                    key={user.id}
                                    className={styles.userAvatar}
                                    style={{ backgroundColor: getUserColor(user.id) }}
                                    onClick={() => onUserClick?.(user)}
                                    title={`${user.username || 'Anonymous'} - ${getActivityDescription(user, userActivities[user.id])}`}
                                >
                                    <span className={styles.userInitials}>
                                        {getUserInitials(user)}
                                    </span>
                                    <div className={styles.activityIndicator}>
                                        {getActivityIcon(userActivities[user.id])}
                                    </div>
                                </div>
                            ))}
                            
                            {hiddenUsersCount > 0 && (
                                <div 
                                    className={`${styles.userAvatar} ${styles.moreUsers}`}
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    title={`Еще ${hiddenUsersCount} пользователей онлайн`}
                                >
                                    <span className={styles.userInitials}>
                                        +{hiddenUsersCount}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Счетчик пользователей */}
                        <div className={styles.userCount}>
                            {totalOtherUsers} в сети
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyPresence}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#9e9e9e">
                            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.5 8H16c-.83 0-1.5.67-1.5 1.5v6h-.5c-.28 0-.5.22-.5.5s.22.5.5.5h.5v6h2v-6h1v6h2zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9V9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v6h1.5v7h3zM12 22v-4h1.5v-7c0-.83-.67-1.5-1.5-1.5h-1V8c0-.55-.45-1-1-1H8.5c-.55 0-1 .45-1 1v1.5H6c-.83 0-1.5.67-1.5 1.5v7H6v4h6z"/>
                        </svg>
                        <span>Только вы</span>
                    </div>
                )}
            </div>

            {/* Расширенная панель */}
            {isExpanded && totalOtherUsers > 0 && (
                <div className={styles.expandedPanel}>
                    <div className={styles.panelHeader}>
                        <span>Пользователи онлайн ({totalOtherUsers})</span>
                        <button 
                            className={styles.closeBtn}
                            onClick={() => setIsExpanded(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className={styles.userList}>
                        {Object.entries(usersByActivity).map(([activityType, users]) => {
                            if (users.length === 0) return null;
                            
                            const activityLabels = {
                                editing: 'Редактируют',
                                viewing: 'Просматривают',
                                idle: 'В сети'
                            };

                            return (
                                <div key={activityType} className={styles.activityGroup}>
                                    <div className={styles.activityHeader}>
                                        {activityLabels[activityType]} ({users.length})
                                    </div>
                                    {users.map(user => (
                                        <div 
                                            key={user.id} 
                                            className={styles.userItem}
                                            onClick={() => onUserClick?.(user)}
                                        >
                                            <div 
                                                className={styles.userItemAvatar}
                                                style={{ backgroundColor: getUserColor(user.id) }}
                                            >
                                                {getUserInitials(user)}
                                            </div>
                                            <div className={styles.userItemInfo}>
                                                <div className={styles.userName}>
                                                    {user.username || 'Anonymous'}
                                                </div>
                                                <div className={styles.userActivity}>
                                                    {getActivityDescription(user, userActivities[user.id])}
                                                </div>
                                            </div>
                                            <div className={styles.userItemActivity}>
                                                {getActivityIcon(userActivities[user.id])}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Уведомления */}
            {notifications.length > 0 && (
                <div className={styles.notifications}>
                    {notifications.map(notification => (
                        <div 
                            key={notification.id}
                            className={`${styles.notification} ${styles[notification.type]}`}
                        >
                            <div 
                                className={styles.notificationAvatar}
                                style={{ backgroundColor: getUserColor(notification.user.id) }}
                            >
                                {getUserInitials(notification.user)}
                            </div>
                            <div className={styles.notificationText}>
                                <strong>{notification.user.username || 'Anonymous'}</strong>
                                {notification.type === 'join' ? ' присоединился' : ' вышел'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LiveUserPresence; 
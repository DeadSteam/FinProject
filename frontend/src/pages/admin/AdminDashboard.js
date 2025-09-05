import React, { useContext } from 'react';
import { Link } from 'react-router-dom';

import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AdminContext } from '../../components/layout/AdminLayout';
import { useApiQuery, useAsyncOperation, useNotifications, useErrorBoundary } from '../../hooks';
import { useAnalyticsService, useUserService, useCategoryService, useShopService, useMetricService } from '../../services/index.js';
import styles from '../../styles/pages/Admin.module.css';

const AdminDashboard = () => {
    const { toggleSidebar } = useContext(AdminContext);
    
    // Сервисы
    const analyticsService = useAnalyticsService();
    const userService = useUserService();
    const categoryService = useCategoryService();
    const shopService = useShopService();
    const metricService = useMetricService();
    
    // Новые хуки для лучшего UX
    const { showSuccess, showError, showInfo } = useNotifications();
    const { ErrorBoundary, resetError } = useErrorBoundary();

    // Используем useApi для загрузки данных
    const usersApi = useApiQuery(
        () => userService.getUsers(),
        [],
        { 
            executeOnMount: true,
            onError: (error) => showError('Ошибка загрузки', `Не удалось загрузить пользователей: ${error.message}`)
        }
    );

    const categoriesApi = useApiQuery(
        () => categoryService.getCategories(),
        [],
        { 
            executeOnMount: true,
            onError: (error) => showError('Ошибка загрузки', `Не удалось загрузить категории: ${error.message}`)
        }
    );

    const shopsApi = useApiQuery(
        () => shopService.getShops(),
        [],
        { 
            executeOnMount: true,
            onError: (error) => showError('Ошибка загрузки', `Не удалось загрузить магазины: ${error.message}`)
        }
    );

    const metricsApi = useApiQuery(
        () => metricService.getMetrics(),
        [],
        { 
            executeOnMount: true,
            onError: (error) => showError('Ошибка загрузки', `Не удалось загрузить метрики: ${error.message}`)
        }
    );
            
    // Асинхронная операция для обновления всех данных
    const refreshOperation = useAsyncOperation(
        async () => {
            showInfo('Обновление данных', 'Загружаем актуальную информацию...');
            
            await Promise.all([
                usersApi.execute(),
                categoriesApi.execute(),
                shopsApi.execute(),
                metricsApi.execute()
            ]);
            
            showSuccess('Данные обновлены', 'Все данные успешно загружены');
        },
        {
            onError: (error) => showError('Ошибка обновления', `Не удалось обновить данные: ${error.message}`)
        }
    );

    // Вычисляемые значения
    const stats = {
        totalUsers: usersApi.data?.length || 0,
        totalCategories: categoriesApi.data?.length || 0,
        totalShops: shopsApi.data?.length || 0,
        totalMetrics: metricsApi.data?.length || 0,
                recentActivity: [
                    { type: 'user', message: 'Новый пользователь зарегистрирован', time: '2 часа назад' },
                    { type: 'category', message: 'Добавлена новая категория', time: '4 часа назад' },
                    { type: 'shop', message: 'Обновлена информация о магазине', time: '6 часов назад' }
                ]
            };
            
    // Проверяем общее состояние загрузки
    const isLoading = usersApi.loading || categoriesApi.loading || shopsApi.loading || metricsApi.loading;
    const hasError = usersApi.error || categoriesApi.error || shopsApi.error || metricsApi.error;

    // Показываем загрузку только при первой загрузке
    if (isLoading && stats.totalUsers === 0) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingSpinner text="Загрузка панели управления..." immediate />
            </div>
        );
    }

    return (
        <ErrorBoundary>
        <div>
                {/* Верхняя панель с кнопкой обновления */}
            <div className={styles.topbar}>
                <h1 className={styles.pageTitle}>Панель управления</h1>
                
                <div className={styles.topbarActions}>
                        <button 
                            className={styles.refreshButton}
                            onClick={refreshOperation.execute}
                            disabled={refreshOperation.loading}
                            title="Обновить данные"
                        >
                            <svg 
                                width="20" 
                                height="20" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                                className={refreshOperation.loading ? styles.spinning : ''}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {refreshOperation.loading ? 'Обновляем...' : 'Обновить'}
                        </button>
                        
                    <button className={styles.mobileSidebarToggle} onClick={toggleSidebar}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                </div>
            </div>

                {/* Статистические карточки с индикаторами загрузки */}
            <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${usersApi.loading ? styles.loading : ''}`}>
                    <div className={styles.statIcon}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <h3>{stats.totalUsers}</h3>
                        <p>Пользователей</p>
                        <Link to="/admin/users" className={styles.statLink}>
                            Управление →
                        </Link>
                    </div>
                        {usersApi.loading && <div className={styles.statLoader}></div>}
                </div>

                    <div className={`${styles.statCard} ${categoriesApi.loading ? styles.loading : ''}`}>
                    <div className={styles.statIcon}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <h3>{stats.totalCategories}</h3>
                        <p>Категорий</p>
                        <Link to="/admin/categories" className={styles.statLink}>
                            Управление →
                        </Link>
                    </div>
                        {categoriesApi.loading && <div className={styles.statLoader}></div>}
                </div>

                    <div className={`${styles.statCard} ${shopsApi.loading ? styles.loading : ''}`}>
                    <div className={styles.statIcon}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <h3>{stats.totalShops}</h3>
                        <p>Магазинов</p>
                        <Link to="/admin/shops" className={styles.statLink}>
                            Управление →
                        </Link>
                    </div>
                        {shopsApi.loading && <div className={styles.statLoader}></div>}
                </div>

                    <div className={`${styles.statCard} ${metricsApi.loading ? styles.loading : ''}`}>
                    <div className={styles.statIcon}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <h3>{stats.totalMetrics}</h3>
                        <p>Метрик</p>
                        <Link to="/admin/metrics" className={styles.statLink}>
                            Управление →
                        </Link>
                    </div>
                        {metricsApi.loading && <div className={styles.statLoader}></div>}
                </div>
            </div>

            {/* Быстрые действия */}
            <div className={styles.quickActions}>
                <h2>Быстрые действия</h2>
                <div className={styles.actionButtons}>
                    <Link to="/admin/users" className={styles.actionButton}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Добавить пользователя
                    </Link>
                    
                    <Link to="/admin/categories" className={styles.actionButton}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Добавить категорию
                    </Link>
                    
                    <Link to="/admin/shops" className={styles.actionButton}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Добавить магазин
                    </Link>
                </div>
            </div>

            {/* Последняя активность */}
            <div className={styles.recentActivity}>
                <h2>Последняя активность</h2>
                <div className={styles.activityList}>
                    {stats.recentActivity.map((activity, index) => (
                        <div key={index} className={styles.activityItem}>
                            <div className={styles.activityIcon}>
                                {activity.type === 'user' && (
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                )}
                                {activity.type === 'category' && (
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                    </svg>
                                )}
                                {activity.type === 'shop' && (
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                    </svg>
                                )}
                            </div>
                            <div className={styles.activityContent}>
                                <p>{activity.message}</p>
                                <span className={styles.activityTime}>{activity.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </ErrorBoundary>
    );
};

export default AdminDashboard; 
 
 
 
 
 
 
 
 

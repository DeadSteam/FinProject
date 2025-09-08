import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthUser } from '../context/auth';
import { usePermissions } from '../hooks';
import { useNotifications } from '../hooks';
import { useErrorBoundary } from '../hooks';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Ленивая загрузка компонентов
const AnalyticsFilters = lazy(() => import('../components/analytics/AnalyticsFilters'));
const AnalyticsCharts = lazy(() => import('../components/analytics/AnalyticsCharts'));
const AnalyticsTrends = lazy(() => import('../components/analytics/AnalyticsTrends'));
const AnalyticsComparison = lazy(() => import('../components/analytics/AnalyticsComparison'));

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Комплексная страница аналитики.
 * Позволяет анализировать данные по множественным критериям:
 * - Сравнение по выбранным годам
 * - Анализ по категориям и магазинам  
 * - Анализ трендов
 * - Сравнение планов и фактов
 */
const Analytics = () => {
    const navigate = useNavigate();
    const user = useAuthUser();
    const { hasRole } = usePermissions();
    const { showSuccess, showError, showInfo } = useNotifications();
    const { ErrorBoundary } = useErrorBoundary();

    // Состояние активной вкладки
    const [activeTab, setActiveTab] = useState('comparison');
    
    // Состояние фильтров
    const [filters, setFilters] = useState({
        years: [],
        categories: [],
        shops: [],
        metrics: ['fact', 'plan'],
        dateRange: {
            start: null,
            end: null
        },
        monthStart: 1,
        monthEnd: 12
    });

    // Состояние данных
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [availableData, setAvailableData] = useState({
        years: [],
        categories: [],
        shops: [],
        metrics: []
    });

    // Проверка авторизации
    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true });
            return;
        }
    }, [user, navigate]);

    // Загрузка доступных данных для фильтров
    useEffect(() => {
        loadAvailableData();
    }, []);

    const loadAvailableData = async () => {
        try {
            setIsLoading(true);
            
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Параллельная загрузка всех справочников
            const [yearsResponse, categoriesResponse, shopsResponse] = await Promise.all([
                fetch('/api/v1/finance/years', { headers }),
                fetch('/api/v1/finance/categories', { headers }),
                fetch('/api/v1/finance/shops', { headers })
            ]);


            if (!yearsResponse.ok || !categoriesResponse.ok || !shopsResponse.ok) {
                throw new Error('Ошибка загрузки справочных данных');
            }

            const [years, categories, shops] = await Promise.all([
                yearsResponse.json(),
                categoriesResponse.json(),
                shopsResponse.json()
            ]);


            // Проверяем, есть ли данные
            if (years.length === 0 && categories.length === 0 && shops.length === 0) {
                showError('Справочные данные отсутствуют. Проверьте базу данных и убедитесь, что есть данные в таблицах Period, Category, Shop.');
                return; // Прерываем выполнение если данных нет
            }
            
            if (years.length === 0) {
                showError('Отсутствуют данные по годам. Добавьте периоды в систему.');
            }
            
            if (categories.length === 0) {
                showError('Отсутствуют категории. Добавьте категории в систему.');
            }
            
            if (shops.length === 0) {
                showError('Отсутствуют магазины. Добавьте магазины в систему.');
            }

            setAvailableData({
                years: years.map(year => ({
                    id: year.year,
                    name: year.year.toString(),
                    value: year.year
                })),
                categories: categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    value: cat.id
                })),
                shops: shops.map(shop => ({
                    id: shop.id,
                    name: shop.name,
                    value: shop.id
                })),
                // Удаляем статические метрики - теперь используются реальные подкатегории из API
                metrics: []
            });

            // Устанавливаем фильтры по умолчанию
            const currentYear = new Date().getFullYear();
            const defaultYears = years
                .filter(year => year.year >= currentYear - 2)
                .map(year => year.year); // Получаем значения для фильтра
            
            setFilters(prev => ({
                ...prev,
                years: defaultYears,
                metrics: ['fact', 'plan'] // Устанавливаем метрики по умолчанию (fact = actual)
            }));


        } catch (error) {
            if (dev) {
                console.error('Ошибка загрузки данных:', error);
            }
            let errorMessage = 'Ошибка загрузки данных';
            
            if (error.message.includes('HTTP 401')) {
                errorMessage = 'Необходима авторизация. Пожалуйста, войдите в систему.';
                navigate('/login', { replace: true });
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = 'Недостаточно прав для просмотра данных.';
            } else if (error.message.includes('HTTP 404')) {
                errorMessage = 'API endpoints не найдены. Проверьте настройки backend.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Нет соединения с сервером. Проверьте подключение.';
            } else {
                errorMessage = 'Ошибка загрузки данных: ' + error.message;
            }
            
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFiltersChange = (newFilters) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters
        }));
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const loadAnalyticsData = async () => {
        try {
            setIsLoading(true);
            
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // Формируем параметры запроса
            const params = new URLSearchParams();
            
            if (filters.years.length > 0) {
                params.append('years', filters.years.join(','));
            }
            if (filters.categories.length > 0) {
                params.append('categories', filters.categories.join(','));
            }
            if (filters.shops.length > 0) {
                params.append('shops', filters.shops.join(','));
            }
            if (filters.metrics.length > 0) {
                params.append('metrics', filters.metrics.join(','));
            }
            // Диапазон месяцев для трендов в месячном режиме (если выбран)
            if (filters.monthStart) params.append('month_start', String(filters.monthStart));
            if (filters.monthEnd) params.append('month_end', String(filters.monthEnd));

            const url = `/api/v1/finance/analytics/comprehensive?${params}`;
                    if (dev) {
        }
            
            const response = await fetch(url, {
                headers
            });

            if (dev) {
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            setAnalyticsData(data);

        } catch (error) {
            if (dev) {
                console.error('Ошибка загрузки аналитических данных:', error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Ручное обновление данных с уведомлениями (для кнопки "Обновить")
    const handleManualRefresh = async () => {
        try {
            await loadAnalyticsData();
            showSuccess('Данные аналитики обновлены');
        } catch (error) {
            if (dev) {
                console.error('Ошибка ручного обновления данных:', error);
            }
            let errorMessage = 'Ошибка загрузки данных';
            
            if (error.message.includes('HTTP 401')) {
                errorMessage = 'Необходима авторизация. Пожалуйста, войдите в систему.';
                navigate('/login', { replace: true });
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = 'Недостаточно прав для просмотра данных.';
            } else if (error.message.includes('HTTP 404')) {
                errorMessage = 'API endpoints не найдены. Проверьте настройки backend.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Нет соединения с сервером. Проверьте подключение.';
            } else {
                errorMessage = 'Ошибка загрузки данных: ' + error.message;
            }
            
            showError(errorMessage);
        }
    };

    // Обновляем данные при изменении фильтров
    useEffect(() => {
        if (filters.years.length > 0 || filters.categories.length > 0 || filters.shops.length > 0) {
            loadAnalyticsData();
        }
    }, [filters]);

    if (!user) {
        return null;
    }

    const tabs = [
        {
            id: 'comparison',
            name: 'Сравнение',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 3v18h18"/>
                    <path d="M18.7 8l-5.1 5.1-2.8-2.8L7 14.1"/>
                </svg>
            ),
            description: 'Сравнение по годам, категориям, магазинам'
        },
        {
            id: 'trends',
            name: 'Тренды',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 3v18h18"/>
                    <path d="M7 12l3-3 3 3 5-5"/>
                </svg>
            ),
            description: 'Анализ трендов и динамики'
        },
        {
            id: 'plan-vs-actual',
            name: 'План vs Факт',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>
            ),
            description: 'Сопоставление планов и фактов'
        },
        {
            id: 'insights',
            name: 'Инсайты',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-4"/>
                    <path d="M12 2l3 7H9l3-7z"/>
                </svg>
            ),
            description: 'Аналитические выводы и рекомендации'
        }
    ];

    return (
        <ErrorBoundary>
            <div className="main-content">
                

                {/* Фильтры */}
                <div className="card mb-4">
                    <Suspense fallback={<div>Загрузка фильтров...</div>}>
                        <AnalyticsFilters
                            filters={filters}
                            availableData={availableData}
                            onChange={handleFiltersChange}
                            isLoading={isLoading}
                        />
                    </Suspense>
                </div>

                {/* Вкладки */}
                <div className="card mb-4">
                    <div className="d-flex flex-wrap" style={{gap: '8px'}}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'} d-flex align-items-center`}
                                onClick={() => handleTabChange(tab.id)}
                                style={{flex: '1', minWidth: '200px'}}
                            >
                                {tab.icon}
                                <div className="ml-2 text-left">
                                    <div className="fw-bold">{tab.name}</div>
                                    <small className="opacity-75">{tab.description}</small>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Контент вкладок */}
                <div className="card">
                    <Suspense fallback={<LoadingSpinner />}>
                        {activeTab === 'comparison' && (
                            <AnalyticsComparison
                                analyticsData={analyticsData}
                                filters={filters}
                                isLoading={isLoading}
                            />
                        )}

                        {activeTab === 'trends' && (
                            <AnalyticsTrends
                                analyticsData={analyticsData}
                                filters={filters}
                                isLoading={isLoading}
                                onMonthRangeChange={(start, end) => setFilters(prev => ({ ...prev, monthStart: start, monthEnd: end }))}
                            />
                        )}

                        {activeTab === 'plan-vs-actual' && (
                            <AnalyticsCharts
                                analyticsData={analyticsData}
                                filters={filters}
                                isLoading={isLoading}
                            />
                        )}

                        {activeTab === 'insights' && (
                            <div className="text-center p-4">
                                <h3 className="mb-3">Аналитические выводы</h3>
                                <p className="text-secondary">Автоматические инсайты и рекомендации на основе данных (в разработке)</p>
                            </div>
                        )}
                    </Suspense>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default Analytics; 
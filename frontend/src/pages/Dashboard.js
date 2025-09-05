import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import LoadingSpinner from '../components/common/LoadingSpinner.js';
import BudgetOverview from '../components/dashboard/BudgetOverview.js';
import CategoryCard from '../components/dashboard/CategoryCard.js';
import DashboardHeader from '../components/dashboard/DashboardHeader.js';
import DashboardInstruction from '../components/dashboard/DashboardInstruction.js';
import StoreCard from '../components/dashboard/StoreCard.js';
import Button from '../components/ui/Button.js';
import { useToast } from '../context/AppContext.js';
import { useApiQuery, useAsyncOperation, useNotifications, useErrorBoundary } from '../hooks';
import { useAnalyticsService, useMetricService, useCategoryService, useShopService } from '../services/index.js';
import styles from '../styles/pages/Dashboard.module.css';

/**
 * @typedef {object} Category
 * @property {string} id - Уникальный идентификатор категории.
 * @property {string} name - Название категории.
 * @property {number} [yearly_plan] - Годовой план расходов.
 * @property {number} [yearly_actual] - Фактические годовые расходы.
 * @property {number} [yearly_procent] - Процент выполнения плана.
 */

/**
 * @typedef {object} Store
 * @property {string} id - Уникальный идентификатор магазина.
 * @property {string} name - Название магазина.
 */

/**
 * Компонент главной страницы (Dashboard).
 * Отображает общую аналитику, списки категорий и магазинов,
 * и позволяет пользователю выбрать комбинацию для просмотра детального отчета.
 * @returns {React.ReactElement} The Dashboard component.
 */
function Dashboard() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const analyticsService = useAnalyticsService();
    const categoryService = useCategoryService();
    const shopService = useShopService();

    // Новые хуки для лучшего UX
    const { showSuccess, showError, showInfo } = useNotifications();
    const { ErrorBoundary, resetError } = useErrorBoundary();

    // UI состояние
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showInstruction, setShowInstruction] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    
    /**
     * Запрос API для получения основной аналитики дашборда.
     * @type {{data: object, loading: boolean, error: Error|null, refetch: function}}
     */
    const dashboardApi = useApiQuery(
        () => analyticsService.getDashboardAnalytics(),
        [],
        { 
            executeOnMount: false,
            onError: (error) => showError('Ошибка загрузки', `Не удалось загрузить данные дашборда: ${error.message}`)
        }
    );

    /**
     * Запрос API для получения списка категорий (используется как fallback).
     * @type {{data: Category[], loading: boolean, error: Error|null, refetch: function}}
     */
    const categoriesApi = useApiQuery(
        () => categoryService.getCategories(),
        [],
        { 
            executeOnMount: false,
            onError: (error) => showError('Ошибка загрузки', `Не удалось загрузить категории: ${error.message}`)
        }
    );

    /**
     * Запрос API для получения списка магазинов (используется как fallback).
     * @type {{data: Store[], loading: boolean, error: Error|null, refetch: function}}
     */
    const shopsApi = useApiQuery(
        () => shopService.getShops(),
        [],
        { 
            executeOnMount: false,
            onError: (error) => showError('Ошибка загрузки', `Не удалось загрузить магазины: ${error.message}`)
        }
    );

    /**
     * Асинхронная операция для ручного обновления данных дашборда.
     * @type {{execute: function, loading: boolean, error: Error|null}}
     */
    const refreshOperation = useAsyncOperation(
        async () => {
            showInfo('Обновление', 'Загружаем актуальные данные...');
            await loadDashboardData();
            showSuccess('Обновлено', 'Данные дашборда обновлены');
        },
        {
            onError: (error) => showError('Ошибка обновления', `Не удалось обновить данные: ${error.message}`)
        }
    );

    /**
     * Мемоизированные данные для компонента обзора бюджета.
     * @type {{plan: number, fact: number, percentage: number, status: string}}
     */
    const budgetData = useMemo(() => {
        return dashboardApi.data?.month_values ? {
            plan: dashboardApi.data.month_values.month_plan || 0,
            fact: dashboardApi.data.month_values.month_actual || 0,
            percentage: dashboardApi.data.month_values.month_procent || 0,
            status: (dashboardApi.data.month_values.month_procent || 0) > 100 ? 'Превышение бюджета' : 'В пределах бюджета'
        } : {
            plan: 0,
            fact: 0,
            percentage: 0,
            status: 'Загрузка данных...'
        };
    }, [dashboardApi.data]);
    
    /**
     * Мемоизированные данные для компонента быстрой статистики.
     * @type {{categoriesCount: number, storesCount: number, expensePercentage: number}}
     */
    const quickStats = useMemo(() => {
        return dashboardApi.data?.dashboard_metrics ? {
            categoriesCount: dashboardApi.data.dashboard_metrics.count_category || 0,
            storesCount: dashboardApi.data.dashboard_metrics.count_shops || 0,
            expensePercentage: dashboardApi.data.dashboard_metrics.all_yearly_procent || 0
        } : {
            categoriesCount: categoriesApi.data?.length || 0,
            storesCount: shopsApi.data?.length || 0,
            expensePercentage: 0
        };
    }, [dashboardApi.data, categoriesApi.data, shopsApi.data]);

    /**
     * Мемоизированный список категорий для отображения.
     * @type {Category[]}
     */
    const categories = useMemo(() => dashboardApi.data?.categories || categoriesApi.data || [], [dashboardApi.data, categoriesApi.data]);
    
    /**
     * Мемоизированный список магазинов для отображения.
     * @type {Store[]}
     */
    const stores = useMemo(() => dashboardApi.data?.shops || shopsApi.data || [], [dashboardApi.data, shopsApi.data]);

    // Загрузка данных при монтировании компонента
    useEffect(() => {
        loadDashboardData();
    }, []);

    /**
     * Загружает все необходимые данные для дашборда.
     * Сначала пытается загрузить агрегированные данные,
     * при неудаче загружает базовые данные по отдельности.
     */
    const loadDashboardData = async () => {
        try {
            // Пытаемся загрузить агрегированные данные дашборда
            await dashboardApi.refetch();
        } catch (error) {
            // Fallback - загружаем базовые данные отдельно
            showInfo('Базовые данные', 'Загружаем базовые данные...');
            await Promise.all([
                categoriesApi.refetch().catch(() => {}),
                shopsApi.refetch().catch(() => {})
            ]);
        }
    };

    /**
     * Обрабатывает выбор категории пользователем.
     * @param {Category} category - Выбранный объект категории.
     */
    const handleCategorySelect = useCallback((category) => {
        setSelectedCategory(category);
        setCurrentStep(2);
        
        // Информируем пользователя о следующем шаге
        showInfo('Категория выбрана', `Теперь выберите магазин для категории "${category.name}"`);
        
        // Прокрутка до секции магазинов
        setTimeout(() => {
            const storesSection = document.querySelector(`.${styles.storesSection}`);
            if (storesSection) {
                storesSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 100);
    }, [showInfo]);

    /**
     * Сбрасывает выбор категории и магазинов.
     */
    const handleResetSelection = useCallback(() => {
        setSelectedCategory(null);
        setCurrentStep(1);
        showInfo('Выбор сброшен', 'Выберите категорию заново');
    }, [showInfo]);

    /**
     * Закрывает инструкцию на дашборде.
     */
    const handleCloseInstruction = useCallback(() => {
        setShowInstruction(false);
        showSuccess('Инструкция скрыта', 'Вы можете использовать дашборд');
    }, [showSuccess]);

    /**
     * Обрабатывает выбор магазина и перенаправляет на страницу детального отчета.
     * @param {Store} store - Выбранный объект магазина.
     */
    const handleStoreSelect = useCallback((store) => {
        if (!selectedCategory) {
            showError('Ошибка', 'Сначала выберите категорию');
            return;
        }
        
        showInfo('Переход', `Загружаем детальные данные для "${store.name}"`);
        navigate(`/finance-details?category=${selectedCategory.id}&shop=${store.id}`);
    }, [selectedCategory, showError, showInfo, navigate]);

    // Показываем загрузку если загружаются основные данные
    if (dashboardApi.loading || (categoriesApi.loading && shopsApi.loading)) {
        return <LoadingSpinner />;
    }

    return (
        <ErrorBoundary>
        <div className={styles.dashboard}>
                {/* Заголовок дашборда с кнопкой обновления */}
                <DashboardHeader 
                    onRefresh={refreshOperation.execute}
                    refreshing={refreshOperation.loading}
                />

            {/* Обзор бюджета */}
            <BudgetOverview budgetData={budgetData} quickStats={quickStats} />

            {/* Инструкция */}
            <DashboardInstruction 
                showInstruction={showInstruction}
                currentStep={currentStep}
                onClose={handleCloseInstruction}
            />

            {/* Секция категорий */}
            <section className={styles.categoriesSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Категории расходов</h2>
                    <div className={styles.sectionBadge}>Шаг 1</div>
                        {categoriesApi.loading && (
                            <div className={styles.sectionLoader}>
                                <svg className={styles.spinning} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                        )}
                </div>
                <div className={styles.categoriesGrid}>
                    {categories.map(category => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            isSelected={selectedCategory?.id === category.id}
                            onSelect={handleCategorySelect}
                        />
                    ))}
                </div>
            </section>

            <div className={styles.sectionDivider}></div>

            {/* Секция магазинов */}
            <section className={`${styles.storesSection} ${selectedCategory ? styles.active : ''}`}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Выберите магазин: <span className={styles.highlightedText}>{selectedCategory?.name || ''}</span>
                    </h2>
                    <div className={styles.sectionBadge}>Шаг 2</div>
                        {shopsApi.loading && (
                            <div className={styles.sectionLoader}>
                                <svg className={styles.spinning} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                        )}
                </div>
                <div className={styles.storesGrid}>
                    {stores.map(store => (
                        <StoreCard
                            key={store.id}
                            store={store}
                            onSelect={handleStoreSelect}
                                disabled={!selectedCategory}
                        />
                    ))}
                </div>
                <div className={styles.storeActions}>
                    <Button 
                        variant="secondary" 
                        onClick={handleResetSelection}
                        className={styles.resetSelection}
                            disabled={!selectedCategory}
                    >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        Сбросить выбор
                    </Button>
                </div>
            </section>
        </div>
        </ErrorBoundary>
    );
}

export default Dashboard; 

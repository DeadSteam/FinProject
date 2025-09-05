import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useToast } from '../../context/AppContext';
import { useApiQuery, usePermissions, useNotifications, useModal } from '../../hooks';
import { useDataVersioning } from '../../hooks/useDataVersioning';
import { useAnalyticsService, useShopService, useMetricService } from '../../services/index.js';
import { useFinanceData } from '../../hooks/useFinanceData';
import { exportFinanceDataToExcel } from '../../utils/excelExport';
import FinanceDetailsView from './FinanceDetailsView';
import { useFinanceFilters } from '../../hooks/useFinanceFilters.js';

/**
 * Container компонент для FinanceDetails
 * Ответственность: управление состоянием, загрузка данных, бизнес-логика
 * Соблюдает принцип SRP - только логика, без UI
 * 
 * Новые возможности:
 * - Версионирование изменений финансовых данных
 * - История изменений с возможностью отката
 * - Отслеживание кто и когда вносил изменения
 */
const FinanceDetailsContainer = () => {
    const { showToast } = useToast();
    const { 
        isAdmin, 
        isModerator, 
        canAccess 
    } = usePermissions();
    const { showSuccess, showError, showWarning } = useNotifications();
    
    // Сервисы через IoC
    const analyticsService = useAnalyticsService();
    const shopService = useShopService();
    const metricService = useMetricService();
    const { selectedYear, selectedShop, changeYear, changeShop, searchParams, setSearchParams } = useFinanceFilters();
    const queryString = searchParams.toString();

    // API хуки для загрузки данных
    const shopsApi = useApiQuery(() => shopService.getShops(), { executeOnMount: true });
    const yearsApi = useApiQuery(() => metricService.api.get('/finance/years'), { executeOnMount: true });

    // 🔄 Интеграция версионирования финансовых данных
    const versioningConfig = {
        enableAutoVersioning: true,
        versionInterval: 10000, // 10 секунд для финансовых данных
        maxVersionHistory: 100, // Ограничиваем историю для производительности
        trackFieldChanges: true,
        ignoreFields: ['_timestamp', 'lastAccessed', 'loading'],
        enableRemoteSync: false, // Пока отключено, добавим позже
        enableLogging: process.env.NODE_ENV === 'development'
    };

    const {
        createVersion,
        getVersionHistory,
        rollbackToVersion,
        compareVersions,
        getCurrentVersion,
        versionMetrics
    } = useDataVersioning(versioningConfig);

    // Состояние компонента
    const {
        metrics,
        periods,
        categoryName,
        loading: dataLoading,
        filtering,
        activeMetric,
        setActiveMetric,
        reload: reloadMetrics
    } = useFinanceData({
        analyticsService,
        metricService,
        searchParams,
        selectedYear,
        selectedShop
    });
    
    // 📊 Состояние для версионирования
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [versionHistory, setVersionHistory] = useState([]);
    const [selectedVersionForCompare, setSelectedVersionForCompare] = useState(null);
    
    // График
    const [chartView, setChartView] = useState('quarters');
    
    // Модальные окна
    const editModal = useModal();
    const initYearModal = useModal();
    const addMetricModal = useModal();
    const yearlyPlanModal = useModal();

    // Вычисляемые значения
    // Гарантируем, что shops всегда массив
    const shops = Array.isArray(shopsApi.data)
        ? shopsApi.data
        : (Array.isArray(shopsApi.data?.shops) ? shopsApi.data.shops : []);
    const years = useMemo(() => {
        let extracted = [];
        if (Array.isArray(yearsApi.data) && yearsApi.data.length) {
            extracted = yearsApi.data.map(y => (typeof y === 'object' && y !== null ? y.year : y));
        }
        // Добавляем выбранный год, если его нет в списке
        const yearInt = parseInt(selectedYear);
        if (!extracted.includes(yearInt)) {
            extracted.push(yearInt);
        }
        return [...new Set(extracted)].sort();
    }, [yearsApi.data, selectedYear]);
    const loading = shopsApi.loading || yearsApi.loading || dataLoading;
    const hasAdminRights = isAdmin || isModerator || canAccess('finance', 'write');

    // Перезагрузка initial data: shops/years уже загружаются через executeOnMount, метрики - в hook
    useEffect(() => {
        (async () => {
            await Promise.all([
                shopsApi.refetch({ throwOnError: false }),
                yearsApi.refetch({ throwOnError: false })
            ]);
        })();
    }, []);

    /**
     * Подготовка данных для графика
     */
    const prepareChartData = () => {
        if (!activeMetric) {
            return [];
        }

        const periodsData = activeMetric.periods_value;
        
        if (!periodsData) {
            return [];
        }

        const isQuarterly = chartView === 'quarters';
        let chartData = [];

        try {
            if (isQuarterly && periodsData.quarters) {
                // Данные по кварталам
                const quarterLabels = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
                const quarterKeys = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
                
                chartData = quarterKeys.map((quarterKey, index) => {
                    const quarterData = periodsData.quarters[quarterKey];
                    const label = quarterLabels[index];
                    
                    const plan = parseFloat(quarterData?.plan || 0);
                    const fact = parseFloat(quarterData?.actual || 0);
                    
                    return {
                        label,
                        plan: isNaN(plan) ? 0 : plan,
                        fact: isNaN(fact) ? 0 : fact
                    };
                });
            } else if (!isQuarterly && periodsData.months) {
                // Данные по месяцам
                const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 
                                  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                const monthKeys = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
                                 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
                                  
                chartData = monthKeys.map((monthKey, index) => {
                    const monthData = periodsData.months[monthKey];
                    const label = monthNames[index];
                    
                    const plan = parseFloat(monthData?.plan || 0);
                    const fact = parseFloat(monthData?.actual || 0);
                    
                    return {
                        label,
                        plan: isNaN(plan) ? 0 : plan,
                        fact: isNaN(fact) ? 0 : fact
                    };
                });
            }
        } catch (error) {
            return [];
        }

        return chartData;
    };

    /**
     * Обработчики событий
     */
    const handleYearChange = changeYear;
    const handleShopChange = changeShop;

    const handleEditValue = (editData) => {
        editModal.open(editData);
    };

    const handleSaveValue = async (updatedData = null) => {
        try {
            // 📊 Создаем версию после изменения данных (только если есть updatedData)
            if (updatedData) {
                const versionData = {
                    entity: 'finance_metrics',
                    entityId: updatedData?.metricId || 'global',
                    data: {
                        metrics,
                        periods,
                        categoryName,
                        selectedYear,
                        selectedShop,
                        updatedData
                    },
                    metadata: {
                        action: 'edit_metric_value',
                        user: 'current_user', // TODO: получить из контекста авторизации
                        timestamp: Date.now(),
                        categoryName,
                        year: selectedYear,
                        shop: selectedShop
                    }
                };

                await createVersion(versionData);
            }
            
            // Всегда перезагружаем данные после сохранения
            await reloadMetrics();
            
            // Обновляем историю версий если она открыта
            if (showVersionHistory) {
                await loadVersionHistory();
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
            // Даже если версионирование не сработало, все равно перезагружаем данные
            try {
                await reloadMetrics();
            } catch (loadError) {
                showError('Ошибка загрузки', `Не удалось обновить данные: ${loadError.message}`);
            }
        }
    };

    // 📊 Методы для работы с версионированием
    const loadVersionHistory = async () => {
        try {
            const history = await getVersionHistory({
                entity: 'finance_metrics',
                entityId: 'global',
                limit: 50
            });
            setVersionHistory(history);
        } catch (error) {
            showError('Ошибка загрузки истории', `Не удалось загрузить историю версий: ${error.message}`);
        }
    };

    const handleShowVersionHistory = async () => {
        setShowVersionHistory(true);
        await loadVersionHistory();
    };

    const handleRollbackToVersion = async (versionId) => {
        try {
            const restoredData = await rollbackToVersion(versionId);
            
            if (restoredData && restoredData.data) {
                // Восстанавливаем состояние из версии
                const { metrics: restoredMetrics, periods: restoredPeriods, categoryName: restoredCategoryName } = restoredData.data;
                
                setActiveMetric(restoredMetrics[0]);
                
                showSuccess('Откат выполнен', `Данные восстановлены к версии от ${new Date(restoredData.timestamp).toLocaleString()}`);
                
                // Перезагружаем данные для синхронизации с сервером
                await reloadMetrics();
                await loadVersionHistory();
            }
        } catch (error) {
            showError('Ошибка отката', `Не удалось выполнить откат к версии: ${error.message}`);
        }
    };

    const handleCompareVersions = async (versionId1, versionId2) => {
        try {
            const comparison = await compareVersions(versionId1, versionId2);
            // TODO: Показать результат сравнения в модальном окне
            console.log('Version comparison:', comparison);
            showSuccess('Сравнение версий', 'Результат сравнения отображен в консоли разработчика');
        } catch (error) {
            showError('Ошибка сравнения', `Не удалось сравнить версии: ${error.message}`);
        }
    };

    const exportToExcel = async () => {
        try {
            await exportFinanceDataToExcel({
                metrics,
                periods,
                categoryName,
                selectedYear,
                selectedShop: selectedShop === 'all' ? 'Все магазины' : (Array.isArray(shops) ? shops.find(s => s.id === parseInt(selectedShop))?.name : null)
            });
            showSuccess('Экспорт', 'Данные успешно экспортированы в Excel');
        } catch (error) {
            showError('Ошибка экспорта', `Не удалось экспортировать данные: ${error.message}`);
        }
    };

    // Обработчики модальных окон
    const handleInitYearSuccess = (year) => {
        showSuccess('Год инициализирован', `Данные для ${year} года успешно созданы`);
        initYearModal.close();
        reloadMetrics();
    };

    const handleAddMetricSuccess = () => {
        showSuccess('Метрика добавлена', 'Новая метрика успешно создана');
        addMetricModal.close();
        reloadMetrics();
    };

    const handleYearlyPlanSuccess = () => {
        showSuccess('План сохранен', 'Годовой план успешно обновлен');
        yearlyPlanModal.close();
        reloadMetrics();
    };

    // Пропсы для View компонента
    const viewProps = {
        // Данные
        metrics,
        periods,
        shops,
        years,
        categoryName,
        
        // Состояние
        loading,
        filtering,
        selectedYear,
        selectedShop,
        activeMetric,
        chartView,
        hasAdminRights,
        
        // 📊 Версионирование
        showVersionHistory,
        versionHistory,
        versionMetrics,
        selectedVersionForCompare,
        
        // Данные для графика
        chartData: prepareChartData(),
        
        // Модальные окна
        editModal,
        initYearModal,
        addMetricModal,
        yearlyPlanModal,
        
        // Обработчики
        onYearChange: handleYearChange,
        onShopChange: handleShopChange,
        onActiveMetricChange: setActiveMetric,
        onChartViewChange: setChartView,
        onEditValue: handleEditValue,
        onSaveValue: handleSaveValue,
        onExport: exportToExcel,
        onInitYear: () => initYearModal.open(),
        onAddMetric: () => addMetricModal.open(),
        onYearlyPlan: () => yearlyPlanModal.open(),
        
        // 📊 Обработчики версионирования
        onShowVersionHistory: handleShowVersionHistory,
        onHideVersionHistory: () => setShowVersionHistory(false),
        onRollbackToVersion: handleRollbackToVersion,
        onCompareVersions: handleCompareVersions,
        onSelectVersionForCompare: setSelectedVersionForCompare,
        
        // Коллбэки модальных окон
        onInitYearSuccess: handleInitYearSuccess,
        onAddMetricSuccess: handleAddMetricSuccess,
        onYearlyPlanSuccess: handleYearlyPlanSuccess,
        
        // URL параметры
        searchParams
    };

    return <FinanceDetailsView {...viewProps} />;
};

export default FinanceDetailsContainer; 

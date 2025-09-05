import React, { createContext, useContext, useMemo } from 'react';

import { ServiceContainer } from '../services/ServiceContainer.js';

/**
 * Контекст для ServiceContainer
 */
const ServiceContext = createContext(null);

/**
 * Provider для ServiceContainer
 * Инициализирует IoC контейнер и предоставляет его всему приложению
 */
export const ServiceProvider = ({ children, config = {}, testMode = false }) => {
  const serviceContainer = useMemo(() => {
    const container = new ServiceContainer(config);
    
    // Настройка для тестирования
    if (testMode) {
      container.setupForTesting();
    }
    
    return container;
  }, [config, testMode]);

  return (
    <ServiceContext.Provider value={serviceContainer}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Хук для получения ServiceContainer
 * @returns {ServiceContainer} - Экземпляр ServiceContainer
 */
export const useServiceContainer = () => {
  const container = useContext(ServiceContext);
  
  if (!container) {
    throw new Error('useServiceContainer must be used within a ServiceProvider');
  }
  
  return container;
};

/**
 * Хук для получения сервиса из контейнера
 * @param {string} serviceName - Имя сервиса или интерфейса
 * @returns {Object} - Экземпляр сервиса
 */
export const useService = (serviceName) => {
  const container = useServiceContainer();
  
  return useMemo(() => {
    try {
      return container.get(serviceName);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to get service '${serviceName}':`, error);
      }
      throw error;
    }
  }, [container, serviceName]);
};

/**
 * Специализированные хуки для типизированного доступа к сервисам
 */
export const useAuthService = () => useService('IAuthService');
export const useUserService = () => useService('IUserService');
export const useCategoryService = () => useService('ICategoryService');
export const useShopService = () => useService('shopService');
export const useMetricService = () => useService('metricService');
export const useAnalyticsService = () => useService('analyticsService');

/**
 * Хук для получения API клиента
 */
export const useApiClient = () => useService('IApiClient');

/**
 * Хок для debugging ServiceContainer
 */
export const useServiceDebug = () => {
  const container = useServiceContainer();
  
  return useMemo(() => ({
    getDebugInfo: () => container.getDebugInfo(),
    validateDependencies: () => container.validateDependencies(),
    getServiceNames: () => container.getServiceNames(),
    mockService: (name, implementation) => container.mockInterface(name, implementation),
    restoreService: (name) => container.restoreInterface(name),
    restoreAllServices: () => container.restoreAllInterfaces()
  }), [container]);
}; 
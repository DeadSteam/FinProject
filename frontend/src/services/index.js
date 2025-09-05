// Экспорт Service Container и IoC компонентов
export { ServiceContainer } from './ServiceContainer.js';
export { getService, registerService } from './ServiceContainer.js';

// Экспорт HTTP клиентов
export { HttpClient } from './http/HttpClient.js';
export { ApiClient } from './http/ApiClient.js';

// Экспорт API сервисов
export { AuthService } from './api/AuthService.js';
export { UserService } from './api/UserService.js';
export { CategoryService } from './api/CategoryService.js';
export { ShopService } from './api/ShopService.js';
export { MetricService } from './api/MetricService.js';
export { AnalyticsService } from './api/AnalyticsService.js';

// Экспорт IoC хуков из ServiceContext
export {
  ServiceProvider,
  useServiceContainer,
  useService,
  useAuthService,
  useUserService,
  useCategoryService,
  useShopService,
  useMetricService,
  useAnalyticsService,
  useApiClient,
  useServiceDebug
} from '../context/ServiceContext.js'; 
import PropTypes from 'prop-types';

// ============ БАЗОВЫЕ ТИПЫ ============

/**
 * Идентификатор записи (обычно число)
 */
export const IdType = PropTypes.oneOfType([PropTypes.number, PropTypes.string]);

/**
 * Временная метка (ISO строка или Date объект)
 */
export const TimestampType = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.instanceOf(Date),
]);

/**
 * Валютная сумма (число с плавающей точкой)
 */
export const CurrencyType = PropTypes.number;

/**
 * Статус операции
 */
export const StatusType = PropTypes.oneOf(['pending', 'success', 'error', 'loading']);

/**
 * Функция обратного вызова
 */
export const CallbackType = PropTypes.func;

// ============ ПОЛЬЗОВАТЕЛЬСКИЕ ТИПЫ ============

/**
 * Роль пользователя в системе
 */
export const UserRoleType = PropTypes.oneOf(['admin', 'user', 'manager']);

/**
 * Пользователь системы
 */
export const UserType = PropTypes.shape({
  id: IdType.isRequired,
  email: PropTypes.string.isRequired,
  firstName: PropTypes.string.isRequired,
  lastName: PropTypes.string.isRequired,
  role: UserRoleType.isRequired,
  phone: PropTypes.string,
  isActive: PropTypes.bool,
  createdAt: TimestampType,
  updatedAt: TimestampType,
});

/**
 * Профиль пользователя с дополнительной информацией
 */
export const UserProfileType = PropTypes.shape({
  ...UserType,
  avatar: PropTypes.string,
  bio: PropTypes.string,
  preferences: PropTypes.object,
  lastLoginAt: TimestampType,
});

// ============ ФИНАНСОВЫЕ ТИПЫ ============

/**
 * Категория расходов/доходов
 */
export const CategoryType = PropTypes.shape({
  id: IdType.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  isIncome: PropTypes.bool.isRequired,
  isActive: PropTypes.bool,
  parentId: IdType,
  createdAt: TimestampType,
});

/**
 * Магазин/место совершения операции
 */
export const ShopType = PropTypes.shape({
  id: IdType.isRequired,
  name: PropTypes.string.isRequired,
  address: PropTypes.string,
  website: PropTypes.string,
  isActive: PropTypes.bool,
  createdAt: TimestampType,
});

/**
 * Финансовая метрика
 */
export const MetricType = PropTypes.shape({
  id: IdType.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  unit: PropTypes.string,
  categoryId: IdType,
  isActive: PropTypes.bool,
  formula: PropTypes.string,
  createdAt: TimestampType,
});

/**
 * Плановое значение метрики
 */
export const PlanValueType = PropTypes.shape({
  id: IdType.isRequired,
  metricId: IdType.isRequired,
  period: PropTypes.string.isRequired,
  plannedValue: CurrencyType.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number,
  createdAt: TimestampType,
});

/**
 * Фактическое значение метрики
 */
export const ActualValueType = PropTypes.shape({
  id: IdType.isRequired,
  metricId: IdType.isRequired,
  period: PropTypes.string.isRequired,
  actualValue: CurrencyType.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number,
  shopId: IdType,
  description: PropTypes.string,
  createdAt: TimestampType,
});

// ============ API ТИПЫ ============

/**
 * Ответ API с пагинацией
 */
export const PaginatedResponseType = PropTypes.shape({
  data: PropTypes.array.isRequired,
  meta: PropTypes.shape({
    total: PropTypes.number.isRequired,
    page: PropTypes.number.isRequired,
    limit: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
  }),
});

/**
 * Стандартный ответ API
 */
export const ApiResponseType = PropTypes.shape({
  success: PropTypes.bool.isRequired,
  data: PropTypes.any,
  message: PropTypes.string,
  error: PropTypes.string,
});

/**
 * Параметры запроса с пагинацией
 */
export const PaginationParamsType = PropTypes.shape({
  page: PropTypes.number,
  limit: PropTypes.number,
  search: PropTypes.string,
  sortBy: PropTypes.string,
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
});

// ============ UI ТИПЫ ============

/**
 * Размеры компонентов
 */
export const SizeType = PropTypes.oneOf(['small', 'medium', 'large']);

/**
 * Варианты стилизации
 */
export const VariantType = PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error']);

/**
 * Направления сортировки
 */
export const SortDirectionType = PropTypes.oneOf(['asc', 'desc']);

/**
 * Данные для построения графиков
 */
export const ChartDataType = PropTypes.shape({
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      data: PropTypes.arrayOf(PropTypes.number).isRequired,
      backgroundColor: PropTypes.string,
      borderColor: PropTypes.string,
      borderWidth: PropTypes.number,
    })
  ).isRequired,
});

/**
 * Опции модального окна
 */
export const ModalOptionsType = PropTypes.shape({
  title: PropTypes.string,
  size: SizeType,
  closable: PropTypes.bool,
  backdrop: PropTypes.bool,
  keyboard: PropTypes.bool,
});

// ============ СОСТОЯНИЕ ПРИЛОЖЕНИЯ ============

/**
 * Состояние загрузки
 */
export const LoadingStateType = PropTypes.shape({
  isLoading: PropTypes.bool.isRequired,
  progress: PropTypes.number,
  message: PropTypes.string,
});

/**
 * Состояние авторизации
 */
export const AuthStateType = PropTypes.shape({
  isAuthenticated: PropTypes.bool.isRequired,
  user: UserType,
  token: PropTypes.string,
  permissions: PropTypes.arrayOf(PropTypes.string),
});

/**
 * Настройки приложения
 */
export const AppSettingsType = PropTypes.shape({
  theme: PropTypes.oneOf(['light', 'dark']),
  language: PropTypes.string,
  currency: PropTypes.string,
  dateFormat: PropTypes.string,
  notifications: PropTypes.bool,
});

// ============ СОБЫТИЯ И ДЕЙСТВИЯ ============

/**
 * Обработчик событий
 */
export const EventHandlerType = PropTypes.func;

/**
 * Тип CRUD операции
 */
export const CrudOperationType = PropTypes.oneOf(['create', 'read', 'update', 'delete']);

/**
 * Результат CRUD операции
 */
export const CrudResultType = PropTypes.shape({
  operation: CrudOperationType.isRequired,
  success: PropTypes.bool.isRequired,
  data: PropTypes.any,
  error: PropTypes.string,
});

// ============ СОСТАВНЫЕ ТИПЫ ============

/**
 * Список пользователей с пагинацией
 */
export const UsersListType = PropTypes.shape({
  users: PropTypes.arrayOf(UserType).isRequired,
  pagination: PaginatedResponseType.meta,
});

/**
 * Список категорий
 */
export const CategoriesListType = PropTypes.arrayOf(CategoryType);

/**
 * Список магазинов
 */
export const ShopsListType = PropTypes.arrayOf(ShopType);

/**
 * Список метрик
 */
export const MetricsListType = PropTypes.arrayOf(MetricType);

/**
 * Финансовые данные для дашборда
 */
export const FinanceDataType = PropTypes.shape({
  metrics: MetricsListType.isRequired,
  categories: CategoriesListType.isRequired,
  shops: ShopsListType.isRequired,
  planValues: PropTypes.arrayOf(PlanValueType),
  actualValues: PropTypes.arrayOf(ActualValueType),
});

// ============ ВАЛИДАЦИОННЫЕ СХЕМЫ ============

/**
 * Схема валидации формы пользователя
 */
export const UserFormSchema = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Введите корректный email адрес',
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Имя должно содержать от 2 до 50 символов',
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Фамилия должна содержать от 2 до 50 символов',
  },
  phone: {
    pattern: /^\+?[1-9]\d{1,14}$/,
    message: 'Введите корректный номер телефона',
  },
};

/**
 * Схема валидации формы категории
 */
export const CategoryFormSchema = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Название категории должно содержать от 3 до 100 символов',
  },
  description: {
    maxLength: 500,
    message: 'Описание не может превышать 500 символов',
  },
  isIncome: {
    required: true,
    message: 'Необходимо указать тип категории',
  },
};

/**
 * Схема валидации формы метрики
 */
export const MetricFormSchema = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Название метрики должно содержать от 3 до 100 символов',
  },
  description: {
    maxLength: 500,
    message: 'Описание не может превышать 500 символов',
  },
  unit: {
    maxLength: 20,
    message: 'Единица измерения не может превышать 20 символов',
  },
};

// ============ ЭКСПОРТ ВСЕХ ТИПОВ ============

export default {
  // Базовые типы
  IdType,
  TimestampType,
  CurrencyType,
  StatusType,
  CallbackType,
  
  // Пользовательские типы
  UserRoleType,
  UserType,
  UserProfileType,
  
  // Финансовые типы
  CategoryType,
  ShopType,
  MetricType,
  PlanValueType,
  ActualValueType,
  
  // API типы
  PaginatedResponseType,
  ApiResponseType,
  PaginationParamsType,
  
  // UI типы
  SizeType,
  VariantType,
  SortDirectionType,
  ChartDataType,
  ModalOptionsType,
  
  // Состояние приложения
  LoadingStateType,
  AuthStateType,
  AppSettingsType,
  
  // События и действия
  EventHandlerType,
  CrudOperationType,
  CrudResultType,
  
  // Составные типы
  UsersListType,
  CategoriesListType,
  ShopsListType,
  MetricsListType,
  FinanceDataType,
  
  // Валидационные схемы
  UserFormSchema,
  CategoryFormSchema,
  MetricFormSchema,
}; 
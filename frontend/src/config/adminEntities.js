import { formatPhone, normalizePhone, validatePhone } from '../utils/phoneUtils.js';

/**
 * Конфигурации для всех админских сущностей
 * Централизованное управление полями, валидацией и логикой
 */

// Конфигурация для пользователей
export const usersConfig = {
    name: 'пользователь',
    namePlural: 'пользователи',
    entityType: 'users',
    
    formFields: {
        username: {
            type: 'text',
            label: 'Логин',
            required: true,
            placeholder: 'Введите логин'
        },
        email: {
            type: 'email',
            label: 'Email',
            required: true,
            placeholder: 'Введите email'
        },
        phone: {
            type: 'text',
            label: 'Номер телефона',
            placeholder: '+7 (999) 999-99-99'
        },
        password: {
            type: 'password',
            label: 'Пароль',
            placeholder: 'Введите пароль'
        },
        role_id: {
            type: 'select',
            label: 'Роль',
            required: true,
            placeholder: 'Выберите роль'
        },
        is_active: {
            type: 'checkbox',
            label: 'Активный пользователь'
        }
    },
    
    validationRules: {
        username: { required: true, minLength: 2 },
        email: { required: true, email: true },
        phone: { phone: true },
        role_id: { required: true }
    },
    
    searchFields: ['username', 'email', 'phone_number'],
    
    filters: {
        role: (user, value) => {
            if (value === 'all') return true;
            return user.role?.id == value;
        }
    },
    
    customHandlers: {
        validateForm: async (formValues, isEditing) => {
            // Валидация пароля для нового пользователя
            if (!isEditing && !formValues.password) {
                return { isValid: false, message: 'Пароль обязателен для нового пользователя' };
            }

            // Валидация номера телефона, если он указан
            if (formValues.phone) {
                const phoneValidation = validatePhone(formValues.phone);
                if (!phoneValidation.isValid) {
                    return { isValid: false, message: `Ошибка в номере телефона: ${phoneValidation.message}` };
                }
            }

            return { isValid: true };
        },
        
        beforeSave: async (formValues, editingItem) => {
            // Нормализуем номер телефона для API
            const normalizedPhone = formValues.phone ? normalizePhone(formValues.phone) : null;

            // Подготавливаем данные для API
            const userData = {
                username: formValues.username,
                email: formValues.email,
                phone_number: normalizedPhone,
                role_id: formValues.role_id || null,
                status: formValues.is_active
            };

            if (editingItem) {
                // Редактирование существующего пользователя
                if (formValues.password) {
                    userData.password = formValues.password;
                }
            } else {
                // Создание нового пользователя
                userData.password = formValues.password;
            }

            return userData;
        },
        
        formatForEdit: (user) => ({
            username: user.username,
            email: user.email,
            phone: user.phone_number ? formatPhone(user.phone_number, 'input') : '',
            role_id: user.role?.id || '',
            password: '',
            is_active: user.status
        }),
        
        afterLoad: async (userService) => {
            // Загружаем роли
            const roles = await userService.getUserRoles();
            return { roles: roles || [] };
        }
    }
};

// Конфигурация для категорий
export const categoriesConfig = {
    name: 'категория',
    namePlural: 'категории',
    entityType: 'categories',
    
    formFields: {
        name: {
            type: 'text',
            label: 'Название',
            required: true,
            placeholder: 'Введите название категории'
        },
        description: {
            type: 'textarea',
            label: 'Описание',
            rows: 3,
            placeholder: 'Введите описание категории'
        },
        image_id: {
            type: 'select',
            label: 'Изображение',
            placeholder: 'Выберите изображение'
        },
        status: {
            type: 'checkbox',
            label: 'Активна'
        }
    },
    
    validationRules: {
        name: { required: true, minLength: 2 }
    },
    
    searchFields: ['name', 'description'],
    
    filters: {},
    
    customHandlers: {
        beforeSave: async (formValues) => ({
            name: formValues.name.trim(),
            description: formValues.description?.trim() || '',
            image_id: formValues.image_id || null,
            status: Boolean(formValues.status) // Принудительно преобразуем в boolean
        }),
        
        formatForEdit: (category) => ({
            name: category.name,
            description: category.description || '',
            image_id: category.image_id || '',
            status: Boolean(category.status) // Преобразуем в boolean при редактировании
        }),
        
        afterLoad: async (categoryService) => {
            // Загружаем изображения
            const images = await categoryService.getImages();
            return { images: images || [] };
        }
    }
};

// Конфигурация для магазинов
export const shopsConfig = {
    name: 'магазин',
    namePlural: 'магазины',
    entityType: 'shops',
    
    formFields: {
        name: {
            type: 'text',
            label: 'Название магазина',
            required: true,
            placeholder: 'Введите название магазина'
        },
        address: {
            type: 'text',
            label: 'Адрес',
            placeholder: 'Введите адрес магазина'
        },
        description: {
            type: 'textarea',
            label: 'Описание',
            rows: 3,
            placeholder: 'Введите описание магазина'
        },
        number_of_staff: {
            type: 'number',
            label: 'Количество сотрудников',
            required: true,
            min: 1,
            placeholder: 'Введите количество сотрудников'
        },
        status: {
            type: 'checkbox',
            label: 'Активен'
        }
    },
    
    validationRules: {
        name: { required: true, minLength: 2 },
        number_of_staff: { required: true, min: 1 }
    },
    
    searchFields: ['name', 'address', 'description'],
    
    filters: {},
    
    customHandlers: {
        beforeSave: async (formValues) => {
            // Правильно форматируем данные перед отправкой
            return {
                name: formValues.name.trim(),
                address: formValues.address?.trim() || '',
                description: formValues.description?.trim() || '',
                number_of_staff: parseInt(formValues.number_of_staff) || 1,
                status: Boolean(formValues.status) // Принудительно преобразуем в boolean
            };
        },
        
        formatForEdit: (shop) => ({
            name: shop.name,
            address: shop.address || '',
            description: shop.description || '',
            number_of_staff: shop.number_of_staff || 1,
            status: Boolean(shop.status) // Преобразуем в boolean при редактировании
        })
    }
};

// Конфигурация для метрик
export const metricsConfig = {
    name: 'метрика',
    namePlural: 'метрики',
    entityType: 'metrics',
    
    formFields: {
        name: {
            type: 'text',
            label: 'Название',
            required: true,
            placeholder: 'Введите название метрики'
        },
        category_id: {
            type: 'select',
            label: 'Категория',
            required: true,
            placeholder: 'Выберите категорию'
        },
        unit: {
            type: 'text',
            label: 'Единица измерения',
            required: true,
            placeholder: 'напр: руб., шт., %'
        }
    },
    
    validationRules: {
        name: { required: true, minLength: 2 },
        category_id: { required: true },
        unit: { required: true, minLength: 1 }
    },
    
    searchFields: ['name', 'unit'],
    
    filters: {
        category: (metric, value) => {
            if (value === 'all') return true;
            return metric.category_id === value;
        }
    },
    
    customHandlers: {
        beforeSave: async (formValues) => ({
            name: formValues.name.trim(),
            category_id: formValues.category_id,
            unit: formValues.unit.trim()
        }),
        
        formatForEdit: (metric) => ({
            name: metric.name,
            category_id: metric.category_id || '',
            unit: metric.unit || ''
        }),
        
        afterLoad: async (categoryService) => {
            // Загружаем категории
            const categories = await categoryService.getCategories();
            return { categories: categories || [] };
        }
    }
};

// Конфигурация для годовых планов
export const yearlyPlansConfig = {
    name: 'годовой план',
    namePlural: 'годовые планы',
    entityType: 'yearly-plans',
    
    formFields: {
        year_id: {
            type: 'select',
            label: 'Год',
            required: true,
            placeholder: 'Выберите год'
        },
        metric_id: {
            type: 'select',
            label: 'Метрика',
            required: true,
            placeholder: 'Выберите метрику'
        },
        shop_id: {
            type: 'select',
            label: 'Магазин',
            required: true,
            placeholder: 'Выберите магазин'
        },
        plan_value: {
            type: 'number',
            label: 'Плановое значение',
            required: true,
            min: 0,
            step: 0.01,
            placeholder: 'Введите плановое значение'
        }
    },
    
    validationRules: {
        year_id: { required: true },
        metric_id: { required: true },
        shop_id: { required: true },
        plan_value: { 
            required: true, 
            min: 0,
            custom: (value) => {
                const num = parseFloat(value);
                if (isNaN(num) || num <= 0) return 'Введите корректное значение плана';
                return null;
            }
        }
    },
    
    searchFields: ['metric_name', 'shop_name'],
    
    filters: {
        year: (plan, value) => value === 'all' || String(plan.year) === String(value),
        metric: (plan, value) => value === 'all' || String(plan.metric_id) === String(value)
    },
    
    customHandlers: {
        beforeSave: async (formValues, editingItem) => {
            const planData = {
                year_id: formValues.year_id,
                metric_id: formValues.metric_id,
                shop_id: formValues.shop_id,
                plan_value: parseFloat(formValues.plan_value)
            };
            
            return planData;
        },
        
        formatForEdit: (plan) => ({
            year_id: plan.year_id || '',
            metric_id: plan.metric_id || '',
            shop_id: plan.shop_id || '',
            plan_value: plan.plan_value || ''
        }),
        
        afterLoad: async (metricService, shopService) => {
            // Загружаем справочные данные
            const [years, metrics, shops] = await Promise.all([
                metricService.api.get('/finance/periods/years'),
                metricService.getMetrics(),
                shopService.getShops()
            ]);
            
            return { 
                years: years || [], 
                metrics: metrics || [], 
                shops: shops || [] 
            };
        }
    }
}; 
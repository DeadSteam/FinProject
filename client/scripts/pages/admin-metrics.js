import { metricsApi } from '../../utils/api/metrics.js';
import { 
    showNotification, 
    populateTable, 
    generateMetricTableRow, 
    confirmAction,
    openModal,
    closeModal,
    resetForm
} from '../utils/helper.js';

/**
 * Сервис для работы с метриками
 */
export class MetricsService {
    constructor() {
        this.metricsApi = metricsApi;
        this.tableBody = null;
        this.metricForm = null;
        this.metricModal = null;
        this.metricSearchInput = null;
        this.categoryFilter = null;
        this.addMetricBtn = null;
        this.saveMetricBtn = null;
        this.metrics = [];
        this.categories = [];
    }

    /**
     * Инициализация сервиса
     */
    init() {
        // Инициализация элементов DOM
        this.tableBody = document.querySelector('.data-table tbody');
        this.metricForm = document.getElementById('metric-form');
        this.metricModal = document.getElementById('metric-modal');
        this.metricSearchInput = document.querySelector('.search-input');
        this.categoryFilter = document.getElementById('category-filter');
        this.addMetricBtn = document.getElementById('add-metric-btn');
        this.saveMetricBtn = document.getElementById('save-metric-btn');

        if (!this.tableBody) {
            console.error('Таблица метрик не найдена');
            return;
        }

        // Инициализация обработчиков событий
        this.initEventListeners();

        // Загрузка данных: сначала загружаем категории, а затем метрики
        this.loadData();
    }

    /**
     * Инициализация обработчиков событий
     */
    initEventListeners() {
        // Поиск метрик
        if (this.metricSearchInput) {
            this.metricSearchInput.addEventListener('input', this.handleSearchInput.bind(this));
        }

        // Фильтрация по категории
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', this.handleCategoryFilter.bind(this));
        }

        // Открытие модального окна для добавления метрики
        if (this.addMetricBtn) {
            this.addMetricBtn.addEventListener('click', this.handleAddMetric.bind(this));
        }

        // Сохранение данных метрики
        if (this.saveMetricBtn) {
            this.saveMetricBtn.addEventListener('click', this.handleSaveMetric.bind(this));
        }

        // Делегирование событий для кнопок редактирования и удаления
        if (this.tableBody) {
            this.tableBody.addEventListener('click', this.handleTableActions.bind(this));
        }
        
        // Закрытие модального окна
        const modalCloseButtons = document.querySelectorAll('.modal-close, .modal-cancel');
        modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', this.handleCloseModal.bind(this));
        });
    }

    /**
     * Загрузка всех необходимых данных
     */
    async loadData() {
        try {
            // Сначала загружаем категории
            await this.loadCategories();
            
            // Затем загружаем метрики, чтобы иметь возможность обогатить их данными о категориях
            await this.loadMetrics();
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            showNotification('Ошибка при загрузке данных. Пожалуйста, обновите страницу.', 'error');
        }
    }

    /**
     * Загрузка списка категорий
     */
    async loadCategories() {
        try {
            const categories = await this.metricsApi.getAllCategories();
            console.log('Загруженные категории:', categories);
            
            // Если категории не загружены или массив пуст, очищаем списки
            if (!categories || categories.length === 0) {
                console.log('Категории не найдены');
                this.categories = [];
                this.populateCategoryDropdowns();
                return;
            }
            
            this.categories = categories;
            this.populateCategoryDropdowns();
        } catch (error) {
            console.error('Ошибка при загрузке категорий:', error);
            showNotification(`Ошибка при загрузке категорий: ${error.message}`, 'error');
            
            // В случае ошибки очищаем списки
            this.categories = [];
            this.populateCategoryDropdowns();
        }
    }

    /**
     * Заполнение выпадающих списков категорий
     */
    populateCategoryDropdowns() {
        console.log('Заполнение выпадающих списков категорий:', this.categories);
        
        const categorySelects = document.querySelectorAll('#category');
        if (!categorySelects.length) {
            console.warn('Селект категорий не найден');
            return;
        }

        categorySelects.forEach(select => {
            // Сохраняем текущее значение
            const currentValue = select.value;
            
            // Очищаем список опций
            select.innerHTML = '';
            
            // Проверяем наличие категорий
            if (!this.categories || this.categories.length === 0) {
                console.warn('Нет данных о категориях для заполнения выпадающего списка');
                select.innerHTML = '<option value="">Нет доступных категорий</option>';
            } else {
                // Добавляем опции из списка категорий
                this.categories.forEach(category => {
                    // Обрабатываем разные форматы данных категории
                    const categoryId = typeof category.id !== 'undefined' ? category.id : category;
                    const categoryName = typeof category.name !== 'undefined' ? category.name : 
                                        (typeof category === 'object' ? JSON.stringify(category) : category);
                    
                    select.insertAdjacentHTML('beforeend', `<option value="${categoryId}">${categoryName}</option>`);
                });
            }
            
            // Восстанавливаем выбранное значение
            if (currentValue) {
                select.value = currentValue;
            }
        });

        // Заполняем фильтр по категориям, если он существует
        if (this.categoryFilter) {
            const currentValue = this.categoryFilter.value;
            
            // Очищаем список опций
            this.categoryFilter.innerHTML = '<option value="all">Все категории</option>';
            
            // Проверяем наличие категорий
            if (!this.categories || this.categories.length === 0) {
                // Оставляем только опцию "Все категории"
            } else {
                // Добавляем опции из списка категорий
                this.categories.forEach(category => {
                    // Обрабатываем разные форматы данных категории
                    const categoryId = typeof category.id !== 'undefined' ? category.id : category;
                    const categoryName = typeof category.name !== 'undefined' ? category.name : 
                                        (typeof category === 'object' ? JSON.stringify(category) : category);
                    
                    this.categoryFilter.insertAdjacentHTML(
                        'beforeend', 
                        `<option value="${categoryId}">${categoryName}</option>`
                    );
                });
            }
            
            // Восстанавливаем выбранное значение
            if (currentValue && currentValue !== 'all') {
                this.categoryFilter.value = currentValue;
            }
        }
    }

    /**
     * Загрузка списка метрик
     */
    async loadMetrics() {
        try {
            const metrics = await this.metricsApi.getAllMetrics();
            console.log('Загруженные метрики:', metrics);
            
            // Если метрики не загружены или массив пуст, показываем пустую таблицу
            if (!metrics || metrics.length === 0) {
                console.log('Метрики не найдены');
                this.metrics = [];
                this.renderMetrics([]);
                return;
            }
            
            // Добавим информацию о категориях к метрикам, если у нас загружены категории
            if (this.categories && this.categories.length > 0) {
                metrics.forEach(metric => {
                    // Если у метрики есть только id категории, но нет объекта категории
                    if (metric.category_id && (!metric.category || !metric.category.name)) {
                        const category = this.categories.find(c => c.id.toString() === metric.category_id.toString());
                        if (category) {
                            metric.category = category;
                        }
                    }
                });
            }
            
            this.metrics = metrics;
            this.renderMetrics(metrics);
        } catch (error) {
            console.error('Ошибка при загрузке метрик:', error);
            showNotification(`Ошибка при загрузке метрик: ${error.message}`, 'error');
            
            // В случае ошибки показываем пустую таблицу
            this.metrics = [];
            this.renderMetrics([]);
        }
    }

    /**
     * Отрисовка метрик в таблице
     */
    renderMetrics(metrics = this.metrics) {
        populateTable(this.tableBody, metrics, generateMetricTableRow);
    }

    /**
     * Обработка события поиска метрик
     */
    handleSearchInput(event) {
        const searchValue = event.target.value.trim().toLowerCase();
        
        // Получаем текущее значение фильтра по категории
        const categoryValue = this.categoryFilter ? this.categoryFilter.value : 'all';
        const categoryId = categoryValue !== 'all' ? categoryValue : null;
        
        this.applyFilters(searchValue, categoryId);
    }

    /**
     * Обработка события фильтрации по категории
     */
    handleCategoryFilter(event) {
        const categoryValue = event.target.value;
        const categoryId = categoryValue !== 'all' ? categoryValue : null;
        
        // Текущее значение поиска
        const searchValue = this.metricSearchInput ? this.metricSearchInput.value.trim() : '';
        
        this.applyFilters(searchValue, categoryId);
    }
    
    /**
     * Применение фильтров и поиска
     */
    async applyFilters(search, categoryId) {
        try {
            // Используем серверный API для поиска и фильтрации
            const metrics = await this.metricsApi.searchMetrics(search, categoryId);
            this.metrics = metrics;
            this.renderMetrics(metrics);
        } catch (error) {
            showNotification(`Ошибка при фильтрации метрик: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка добавления новой метрики
     */
    handleAddMetric() {
        // Очищаем форму
        resetForm(this.metricForm);
        document.getElementById('metric-id').value = '';
        
        // Меняем заголовок модального окна
        this.metricModal.querySelector('.modal-title').textContent = 'Добавить метрику';
        
        // Открываем модальное окно
        openModal(this.metricModal);
    }

    /**
     * Обработка событий в таблице (редактирование, удаление)
     */
    handleTableActions(event) {
        const target = event.target.closest('.row-action');
        if (!target) return;
        
        const metricId = target.getAttribute('data-id');
        
        if (target.classList.contains('edit-metric-btn')) {
            this.handleEditMetric(metricId);
        } else if (target.classList.contains('delete-metric-btn')) {
            this.handleDeleteMetric(metricId);
        }
    }

    /**
     * Обработка редактирования метрики
     */
    async handleEditMetric(metricId) {
        try {
            const metric = await this.metricsApi.getMetricById(metricId);
            
            // Заполняем форму данными метрики
            document.getElementById('metric-id').value = metric.id;
            document.getElementById('metric-name').value = metric.name;
            
            // Обработка категории с учетом различных вариантов представления данных
            const categorySelect = document.getElementById('category');
            if (metric.category && metric.category.id) {
                // Если категория представлена как объект с id
                categorySelect.value = metric.category.id;
            } else if (metric.category_id) {
                // Если id категории представлен как отдельное поле
                categorySelect.value = metric.category_id;
            }
            
            document.getElementById('unit').value = metric.unit || '';
            
            // Меняем заголовок модального окна
            this.metricModal.querySelector('.modal-title').textContent = 'Редактировать метрику';
            
            // Открываем модальное окно
            openModal(this.metricModal);
        } catch (error) {
            showNotification(`Ошибка при загрузке метрики: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка удаления метрики
     */
    handleDeleteMetric(metricId) {
        confirmAction(
            'Вы уверены, что хотите удалить эту метрику? Это действие нельзя отменить.',
            async () => {
                try {
                    await this.metricsApi.deleteMetric(metricId);
                    
                    // Удаляем метрику из списка
                    this.metrics = this.metrics.filter(metric => metric.id.toString() !== metricId);
                    
                    // Обновляем таблицу
                    this.renderMetrics();
                    
                    showNotification('Метрика успешно удалена', 'success');
                } catch (error) {
                    showNotification(`Ошибка при удалении метрики: ${error.message}`, 'error');
                }
            }
        );
    }

    /**
     * Обработка сохранения метрики
     */
    async handleSaveMetric() {
        // Проверяем валидность формы
        if (!this.metricForm.checkValidity()) {
            this.metricForm.reportValidity();
            return;
        }
        
        // Получаем данные из формы
        const metricId = document.getElementById('metric-id').value;
        const metricName = document.getElementById('metric-name').value;
        const categoryId = document.getElementById('category').value;
        const unit = document.getElementById('unit').value;
        
        // Подготовка данных для отправки на сервер
        const metricData = {
            name: metricName,
            category_id: categoryId,
            unit: unit
        };
        
        try {
            let response;
            
            if (metricId) {
                // Обновление существующей метрики
                response = await this.metricsApi.updateMetric(metricId, metricData);
                showNotification('Метрика успешно обновлена', 'success');
            } else {
                // Создание новой метрики
                response = await this.metricsApi.createMetric(metricData);
                showNotification('Метрика успешно создана', 'success');
            }
            
            // Обновляем список метрик
            await this.loadMetrics();
            
            // Закрываем модальное окно
            closeModal(this.metricModal);
        } catch (error) {
            showNotification(`Ошибка при сохранении метрики: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка закрытия модального окна
     */
    handleCloseModal(event) {
        // Находим ближайшее модальное окно
        const modal = event.target.closest('.modal');
        if (modal) {
            closeModal(modal);
        }
    }
}

// Инициализация сервиса при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const metricsService = new MetricsService();
    metricsService.init();
}); 
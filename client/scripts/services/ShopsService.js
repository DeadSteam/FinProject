import { shopsApi } from '../../utils/api/shops.js';
import { 
    showNotification, 
    populateTable, 
    generateShopTableRow, 
    confirmAction,
    openModal,
    closeModal,
    resetForm
} from '../utils/helper.js';

/**
 * Сервис для работы с магазинами
 */
export class ShopsService {
    constructor() {
        this.shopsApi = shopsApi;
        this.tableBody = null;
        this.shopForm = null;
        this.shopModal = null;
        this.shopSearchInput = null;
        this.statusFilter = null;
        this.addShopBtn = null;
        this.saveShopBtn = null;
        this.shops = [];
    }

    /**
     * Инициализация сервиса
     */
    init() {
        // Инициализация элементов DOM
        this.tableBody = document.querySelector('.data-table tbody');
        this.shopForm = document.getElementById('shop-form');
        this.shopModal = document.getElementById('shop-modal');
        this.shopSearchInput = document.querySelector('.search-input');
        this.statusFilter = document.getElementById('shop-status-filter');
        this.addShopBtn = document.getElementById('add-shop-btn');
        this.saveShopBtn = document.getElementById('save-shop-btn');

        if (!this.tableBody) {
            console.error('Таблица магазинов не найдена');
            return;
        }

        // Инициализация обработчиков событий
        this.initEventListeners();

        // Загрузка данных
        this.loadShops();
    }

    /**
     * Инициализация обработчиков событий
     */
    initEventListeners() {
        // Поиск магазинов
        if (this.shopSearchInput) {
            this.shopSearchInput.addEventListener('input', this.handleSearchInput.bind(this));
        }

        // Фильтрация по статусу
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', this.handleStatusFilter.bind(this));
        }

        // Открытие модального окна для добавления магазина
        if (this.addShopBtn) {
            this.addShopBtn.addEventListener('click', this.handleAddShop.bind(this));
        }

        // Сохранение данных магазина
        if (this.saveShopBtn) {
            this.saveShopBtn.addEventListener('click', this.handleSaveShop.bind(this));
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
     * Загрузка списка магазинов
     */
    async loadShops() {
        try {
            const shops = await this.shopsApi.getAllShops();
            this.shops = shops;
            this.renderShops(shops);
        } catch (error) {
            showNotification(`Ошибка при загрузке магазинов: ${error.message}`, 'error');
        }
    }

    /**
     * Отрисовка магазинов в таблице
     */
    renderShops(shops = this.shops) {
        populateTable(this.tableBody, shops, generateShopTableRow);
    }

    /**
     * Обработка события поиска магазинов
     */
    handleSearchInput(event) {
        const searchValue = event.target.value.trim().toLowerCase();
        
        // Текущее значение фильтра по статусу
        const statusValue = this.statusFilter ? this.statusFilter.value : 'all';
        const statusFilter = statusValue !== 'all' ? statusValue === 'active' : null;
        
        this.loadFilteredShops(searchValue, statusFilter);
    }

    /**
     * Обработка события фильтрации по статусу
     */
    handleStatusFilter(event) {
        const statusValue = event.target.value;
        
        // Текущее значение поиска
        const searchValue = this.shopSearchInput ? this.shopSearchInput.value.trim() : '';
        
        // Преобразуем значение статуса в булевый тип для API
        const statusFilter = statusValue !== 'all' ? statusValue === 'active' : null;
        
        this.loadFilteredShops(searchValue, statusFilter);
    }
    
    /**
     * Загрузка отфильтрованных магазинов с использованием серверной фильтрации
     */
    async loadFilteredShops(search, status) {
        try {
            // Используем новый серверный эндпоинт для фильтрации
            const shops = await this.shopsApi.searchShops(search, status);
            this.shops = shops;
            this.renderShops(shops);
        } catch (error) {
            showNotification(`Ошибка при фильтрации магазинов: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка события добавления нового магазина
     */
    handleAddShop() {
        const modalTitle = this.shopModal.querySelector('.modal-title');
        modalTitle.textContent = 'Добавить магазин';
        
        // Очистка формы
        resetForm(this.shopForm);
        document.getElementById('shop-id').value = '';
        
        // Открытие модального окна
        openModal(this.shopModal);
    }

    /**
     * Обработка действий в таблице (редактирование, удаление)
     */
    handleTableActions(event) {
        const target = event.target.closest('.row-action');
        
        if (!target) return;
        
        const shopId = target.getAttribute('data-id');
        
        if (target.classList.contains('edit-shop-btn')) {
            this.handleEditShop(shopId);
        } else if (target.classList.contains('delete-shop-btn')) {
            this.handleDeleteShop(shopId);
        }
    }

    /**
     * Обработка события редактирования магазина
     */
    async handleEditShop(shopId) {
        try {
            const shop = await this.shopsApi.getShopById(shopId);
            
            // Заполнение формы данными магазина
            const modalTitle = this.shopModal.querySelector('.modal-title');
            modalTitle.textContent = 'Редактировать магазин';
            
            document.getElementById('shop-id').value = shop.id;
            document.getElementById('shop-name').value = shop.name;
            document.getElementById('shop-address').value = shop.address || '';
            document.getElementById('shop-description').value = shop.description || '';
            document.getElementById('shop-number-of-staff').value = shop.number_of_staff;
            document.getElementById('shop-status').checked = shop.status;
            
            // Открытие модального окна
            openModal(this.shopModal);
        } catch (error) {
            showNotification(`Ошибка при загрузке данных магазина: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка события удаления магазина
     */
    handleDeleteShop(shopId) {
        const shop = this.shops.find(s => s.id === shopId);
        
        if (!shop) {
            showNotification('Магазин не найден', 'error');
            return;
        }
        
        confirmAction(
            `Вы уверены, что хотите удалить магазин "${shop.name}"? Это действие нельзя отменить.`,
            async () => {
                try {
                    await this.shopsApi.deleteShop(shopId);
                    this.shops = this.shops.filter(s => s.id !== shopId);
                    this.renderShops();
                    showNotification('Магазин успешно удален', 'success');
                } catch (error) {
                    showNotification(`Ошибка при удалении магазина: ${error.message}`, 'error');
                }
            }
        );
    }

    /**
     * Обработка события сохранения данных магазина
     */
    async handleSaveShop() {
        if (!this.shopForm.checkValidity()) {
            this.shopForm.reportValidity();
            return;
        }
        
        const shopId = document.getElementById('shop-id').value;
        const shopData = {
            name: document.getElementById('shop-name').value,
            address: document.getElementById('shop-address').value,
            description: document.getElementById('shop-description').value,
            number_of_staff: parseInt(document.getElementById('shop-number-of-staff').value) || 0,
            status: document.getElementById('shop-status').checked
        };
        
        try {
            let shop;
            
            if (shopId) {
                // Обновление существующего магазина
                shop = await this.shopsApi.updateShop(shopId, shopData);
                
                // Обновление списка магазинов
                this.shops = this.shops.map(s => s.id === shopId ? shop : s);
                showNotification('Магазин успешно обновлен', 'success');
            } else {
                // Создание нового магазина
                shop = await this.shopsApi.createShop(shopData);
                
                // Добавление в список магазинов
                this.shops.push(shop);
                showNotification('Магазин успешно создан', 'success');
            }
            
            // Перерисовка таблицы и закрытие модального окна
            this.renderShops();
            closeModal(this.shopModal);
        } catch (error) {
            showNotification(`Ошибка при сохранении магазина: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка закрытия модального окна
     */
    handleCloseModal(event) {
        const modal = event.target.closest('.modal');
        if (modal) {
            closeModal(modal);
        }
    }
} 
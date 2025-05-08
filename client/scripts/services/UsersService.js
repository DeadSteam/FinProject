import { usersApi } from '../../utils/api/users.js';
import { 
    showNotification, 
    populateTable, 
    generateUserTableRow, 
    confirmAction,
    openModal,
    closeModal,
    resetForm
} from '../utils/helper.js';

/**
 * Сервис для работы с пользователями
 */
export class UsersService {
    constructor() {
        this.usersApi = usersApi;
        this.tableBody = null;
        this.userForm = null;
        this.userModal = null;
        this.userSearchInput = null;
        this.statusFilter = null;
        this.roleFilter = null;
        this.addUserBtn = null;
        this.saveUserBtn = null;
        this.users = [];
        this.roles = [];
    }

    /**
     * Инициализация сервиса
     */
    init() {
        // Инициализация элементов DOM
        this.tableBody = document.querySelector('.data-table tbody');
        this.userForm = document.getElementById('user-form');
        this.userModal = document.getElementById('user-modal');
        this.userSearchInput = document.querySelector('.search-input');
        this.statusFilter = document.getElementById('user-status-filter');
        this.roleFilter = document.getElementById('user-role-filter');
        this.addUserBtn = document.getElementById('add-user-btn');
        this.saveUserBtn = document.getElementById('save-user-btn');

        if (!this.tableBody) {
            console.error('Таблица пользователей не найдена');
            return;
        }

        // Инициализация обработчиков событий
        this.initEventListeners();

        // Загрузка данных
        this.loadRoles();
        this.loadUsers();
    }

    /**
     * Инициализация обработчиков событий
     */
    initEventListeners() {
        // Поиск пользователей
        if (this.userSearchInput) {
            this.userSearchInput.addEventListener('input', this.handleSearchInput.bind(this));
        }

        // Фильтрация по статусу
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', this.handleStatusFilter.bind(this));
        }

        // Фильтрация по роли
        if (this.roleFilter) {
            this.roleFilter.addEventListener('change', this.handleRoleFilter.bind(this));
        }

        // Открытие модального окна для добавления пользователя
        if (this.addUserBtn) {
            this.addUserBtn.addEventListener('click', this.handleAddUser.bind(this));
        }

        // Сохранение данных пользователя
        if (this.saveUserBtn) {
            this.saveUserBtn.addEventListener('click', this.handleSaveUser.bind(this));
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
     * Загрузка списка ролей
     */
    async loadRoles() {
        try {
            const roles = await this.usersApi.getAllRoles();
            this.roles = roles;
            this.populateRoleDropdowns();
        } catch (error) {
            showNotification(`Ошибка при загрузке ролей: ${error.message}`, 'error');
        }
    }

    /**
     * Заполнение выпадающих списков ролей
     */
    populateRoleDropdowns() {
        const roleSelects = document.querySelectorAll('.role-select');
        if (!roleSelects.length) return;

        roleSelects.forEach(select => {
            // Сохраняем текущее значение
            const currentValue = select.value;
            
            // Очищаем список опций, оставляя пустую опцию
            select.innerHTML = '<option value="">Выберите роль</option>';
            
            // Добавляем опции из списка ролей
            this.roles.forEach(role => {
                select.insertAdjacentHTML('beforeend', `<option value="${role.id}">${role.name}</option>`);
            });
            
            // Восстанавливаем выбранное значение
            if (currentValue) {
                select.value = currentValue;
            }
        });

        // Заполняем фильтр по ролям, если он существует
        if (this.roleFilter) {
            const currentValue = this.roleFilter.value;
            
            // Очищаем список опций
            this.roleFilter.innerHTML = '<option value="all">Все роли</option>';
            
            // Добавляем опции из списка ролей
            this.roles.forEach(role => {
                this.roleFilter.insertAdjacentHTML('beforeend', `<option value="${role.id}">${role.name}</option>`);
            });
            
            // Восстанавливаем выбранное значение
            if (currentValue && currentValue !== 'all') {
                this.roleFilter.value = currentValue;
            }
        }
    }

    /**
     * Загрузка списка пользователей
     */
    async loadUsers() {
        try {
            const users = await this.usersApi.getAllUsers();
            this.users = users;
            this.renderUsers(users);
        } catch (error) {
            showNotification(`Ошибка при загрузке пользователей: ${error.message}`, 'error');
        }
    }

    /**
     * Отрисовка пользователей в таблице
     */
    renderUsers(users = this.users) {
        populateTable(this.tableBody, users, generateUserTableRow);
    }

    /**
     * Обработка события поиска пользователей
     */
    handleSearchInput(event) {
        const searchValue = event.target.value.trim().toLowerCase();
        
        // Получаем текущие значения фильтров
        const statusValue = this.statusFilter ? this.statusFilter.value : 'all';
        const roleValue = this.roleFilter ? this.roleFilter.value : 'all';
        
        // Вызываем фильтрацию
        this.applyFilters(statusValue, roleValue, searchValue);
    }

    /**
     * Обработка события фильтрации по статусу
     */
    handleStatusFilter(event) {
        const statusValue = event.target.value;
        const roleValue = this.roleFilter ? this.roleFilter.value : 'all';
        const searchValue = this.userSearchInput ? this.userSearchInput.value.trim() : '';
        
        this.applyFilters(statusValue, roleValue, searchValue);
    }

    /**
     * Обработка события фильтрации по роли
     */
    handleRoleFilter(event) {
        const roleValue = event.target.value;
        const statusValue = this.statusFilter ? this.statusFilter.value : 'all';
        const searchValue = this.userSearchInput ? this.userSearchInput.value.trim() : '';
        
        this.applyFilters(statusValue, roleValue, searchValue);
    }

    /**
     * Применение всех фильтров
     */
    async applyFilters(statusValue, roleValue, searchValue = '') {
        try {
            // Преобразуем значения фильтров для API
            const status = statusValue !== 'all' ? statusValue === 'active' : null;
            const roleId = roleValue !== 'all' ? roleValue : null;
            const search = searchValue.trim() || null;
            
            // Вызываем API с фильтрами
            const users = await this.usersApi.searchUsers(search, status, roleId);
            this.users = users;
            this.renderUsers(users);
        } catch (error) {
            showNotification(`Ошибка при фильтрации пользователей: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка события добавления нового пользователя
     */
    handleAddUser() {
        const modalTitle = this.userModal.querySelector('.modal-title');
        modalTitle.textContent = 'Добавить пользователя';
        
        // Очистка формы
        resetForm(this.userForm);
        document.getElementById('user-id').value = '';
        
        // Показываем поля для пароля
        const passwordFields = document.querySelectorAll('.password-field');
        passwordFields.forEach(field => field.classList.remove('d-none'));
        
        // Делаем поля пароля обязательными
        const passwordInput = document.getElementById('user-password');
        if (passwordInput) {
            passwordInput.setAttribute('required', 'required');
        }
        
        // Открытие модального окна
        openModal(this.userModal);
    }

    /**
     * Обработка действий в таблице (редактирование, удаление)
     */
    handleTableActions(event) {
        const target = event.target.closest('.row-action');
        
        if (!target) return;
        
        const userId = target.getAttribute('data-id');
        
        if (target.classList.contains('edit-user-btn')) {
            this.handleEditUser(userId);
        } else if (target.classList.contains('delete-user-btn')) {
            this.handleDeleteUser(userId);
        }
    }

    /**
     * Обработка события редактирования пользователя
     */
    async handleEditUser(userId) {
        try {
            const user = await this.usersApi.getUserById(userId);
            
            // Заполнение формы данными пользователя
            const modalTitle = this.userModal.querySelector('.modal-title');
            modalTitle.textContent = 'Редактировать пользователя';
            
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-username').value = user.username;
            document.getElementById('user-email').value = user.email || '';
            
            const roleSelect = document.getElementById('user-role');
            if (roleSelect && user.role) {
                roleSelect.value = user.role.id;
            }
            
            document.getElementById('user-status').checked = user.status;
            
            // Скрываем поля для пароля при редактировании
            const passwordFields = document.querySelectorAll('.password-field');
            passwordFields.forEach(field => field.classList.add('d-none'));
            
            // Делаем поля пароля необязательными
            const passwordInput = document.getElementById('user-password');
            if (passwordInput) {
                passwordInput.removeAttribute('required');
            }
            
            // Открытие модального окна
            openModal(this.userModal);
        } catch (error) {
            showNotification(`Ошибка при загрузке данных пользователя: ${error.message}`, 'error');
        }
    }

    /**
     * Обработка события удаления пользователя
     */
    handleDeleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        
        if (!user) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        confirmAction(
            `Вы уверены, что хотите удалить пользователя "${user.username}"? Это действие нельзя отменить.`,
            async () => {
                try {
                    await this.usersApi.deleteUser(userId);
                    this.users = this.users.filter(u => u.id !== userId);
                    this.renderUsers();
                    showNotification('Пользователь успешно удален', 'success');
                } catch (error) {
                    showNotification(`Ошибка при удалении пользователя: ${error.message}`, 'error');
                }
            }
        );
    }

    /**
     * Обработка события сохранения данных пользователя
     */
    async handleSaveUser() {
        if (!this.userForm.checkValidity()) {
            this.userForm.reportValidity();
            return;
        }
        
        const userId = document.getElementById('user-id').value;
        const isNewUser = !userId;
        
        const userData = {
            username: document.getElementById('user-username').value,
            email: document.getElementById('user-email').value,
            status: document.getElementById('user-status').checked,
        };
        
        // Добавляем роль, если выбрана
        const roleSelect = document.getElementById('user-role');
        if (roleSelect && roleSelect.value) {
            userData.role_id = roleSelect.value;
        }
        
        // Добавляем пароль только для новых пользователей или если он был введен
        const passwordInput = document.getElementById('user-password');
        if (passwordInput && passwordInput.value) {
            userData.password = passwordInput.value;
        }
        
        try {
            let user;
            
            if (isNewUser) {
                // Создание нового пользователя
                user = await this.usersApi.createUser(userData);
                
                // Добавление в список пользователей
                this.users.push(user);
                showNotification('Пользователь успешно создан', 'success');
            } else {
                // Обновление существующего пользователя
                user = await this.usersApi.updateUser(userId, userData);
                
                // Обновление списка пользователей
                this.users = this.users.map(u => u.id === userId ? user : u);
                showNotification('Пользователь успешно обновлен', 'success');
            }
            
            // Перерисовка таблицы и закрытие модального окна
            this.renderUsers();
            closeModal(this.userModal);
        } catch (error) {
            showNotification(`Ошибка при сохранении пользователя: ${error.message}`, 'error');
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
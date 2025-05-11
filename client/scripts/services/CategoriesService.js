import {categoriesApi} from '../utils/api/categories.js';
import {
    showNotification,
    openModal,
    closeModal,
    confirmAction,
    resetForm
} from '../utils/helper.js';

export class CategoriesService {
    constructor() {
        this.domElements = {
            tableBody: document.querySelector('.data-table tbody'),
            categoryForm: document.getElementById('category-form'),
            categoryModal: document.getElementById('category-modal'),
            searchInput: document.querySelector('.search-input'),
            statusFilter: document.getElementById('category-status-filter'),
            addButton: document.getElementById('add-category-btn'),
            saveButton: document.getElementById('save-category-btn'),
            imageGallery: document.getElementById('image-gallery')
        };

        this.images = [];
        this.selectedImageId = null;
    }

    init() {
        if (!this.domElements.tableBody) {
            console.error('Критические элементы DOM не найдены');
            return;
        }

        this.initEventListeners();
        this.loadCategories();
        this.loadImages();
    }

    initEventListeners() {
        const { searchInput, statusFilter, addButton, saveButton, tableBody } = this.domElements;

        searchInput?.addEventListener('input', e => this.handleSearch(e.target.value));
        statusFilter?.addEventListener('change', e => this.handleFilter(e.target.value));
        addButton?.addEventListener('click', () => this.openCategoryForm());
        saveButton?.addEventListener('click', e => this.handleSave(e));
        tableBody?.addEventListener('click', e => this.handleTableClick(e));
        
        const closeButtons = document.querySelectorAll('.modal-close, .modal-cancel');
        closeButtons.forEach(button => {
            button?.addEventListener('click', () => {
                closeModal(this.domElements.categoryModal);
            });
        });
    }

    async loadCategories(filters = {}) {
        try {
            const categories = await categoriesApi.getAll(filters);
            this.renderCategories(categories);
        } catch (error) {
            showNotification(`Ошибка загрузки: ${error.message}`, 'error');
        }
    }

    renderCategories(categories) {
        const statusFilter = this.domElements.statusFilter.value;
        let filteredCategories = categories;

        // Фильтрация по статусу
        if (statusFilter === 'active') {
            filteredCategories = categories.filter(cat => cat.status);
        } else if (statusFilter === 'inactive') {
            filteredCategories = categories.filter(cat => !cat.status);
        }

        // Фильтрация по поиску
        const searchQuery = this.domElements.searchInput.value.toLowerCase().trim();
        if (searchQuery) {
            filteredCategories = filteredCategories.filter(cat =>
                cat.name.toLowerCase().includes(searchQuery) ||
                (cat.description && cat.description.toLowerCase().includes(searchQuery))
            );
        }

        // Очистка и рендер
        this.domElements.tableBody.innerHTML = filteredCategories
            .map(category => `
            <tr class="category-row">
                <td data-label="Название">
                    <div class="category-cell">
                        <div class="category-name">${category.name}</div>
                    </div>
                </td>
                <td data-label="Описание">${category.description || '-'}</td>
                <td data-label="Изображение">
                    ${this.renderImage(category.image)}
                </td>
                <td data-label="Статус">
                    <span class="status status-${category.status ? 'active' : 'inactive'}">
                        ${category.status ? 'Активна' : 'Неактивна'}
                    </span>
                </td>
                <td data-label="Действия">
                    <div class="actions-cell">
                        <button class="row-action edit-btn" data-id="${category.id}">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                        </button>
                        <button class="row-action delete-btn" data-id="${category.id}">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                             </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (!filteredCategories.length) {
            this.domElements.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Категории не найдены</td>
            </tr>
        `;
        }
    }

    renderImage(image) {
        if (!image?.svg_data) return '-';
        return `
        <div class="category-icon" style="width: 40px; height: 40px;
            display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="${image.svg_data}"/>
            </svg>
        </div>
    `;
    }

    async loadImages() {
        try {
            this.images = await categoriesApi.getImages();
            this.renderImageGallery();
        } catch (error) {
            showNotification(`Ошибка загрузки изображений: ${error.message}`, 'error');
        }
    }

    renderImageGallery() {
        const gallery = this.domElements.imageGallery;
        gallery.innerHTML = [
            {id: null, name: 'Без изображения'},
            ...this.images
        ].map(image => `
        <div class="image-item ${image.id === this.selectedImageId ? 'selected' : ''}" 
            data-id="${image.id}">
            ${image.id ? `
                <div class="category-icon" style="width: 60px; height: 60px;">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                        <path d="${image.svg_data}"/>
                    </svg>
                </div>
            ` : '<div class="empty-image"></div>'}
            <div class="image-name">${image.name}</div>
        </div>
    `).join('');

        // Добавление обработчиков выбора изображения
        gallery.querySelectorAll('.image-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectedImageId = item.dataset.id;
                this.renderImageGallery();
                document.querySelector('[name="image_id"]').value = this.selectedImageId;
            });
        });
    }

    handleSearch = (value) => {
        this.loadCategories({
            search: value.trim(),
            status: this.domElements.statusFilter.value
        });
    }

    handleFilter = (status) => {
        this.loadCategories({
            search: this.domElements.searchInput.value.trim(),
            status: status
        });
    }

    handleTableClick = (e) => {
        const target = e.target.closest('[data-id]');
        if (!target) return;

        const action = target.classList.contains('edit-btn') ? 'edit' :
            target.classList.contains('delete-btn') ? 'delete' : null;

        if (action === 'edit') this.handleEdit(target.dataset.id);
        if (action === 'delete') this.handleDelete(target.dataset.id);
    }

    async handleEdit(id) {
        try {
            const category = await categoriesApi.getById(id);
            this.fillForm(category);
            this.selectedImageId = category.image_id;
            this.renderImageGallery();
            openModal(this.domElements.categoryModal);
        } catch (error) {
            showNotification(`Ошибка редактирования: ${error.message}`, 'error');
        }
    }

    async handleDelete(id) {
        const category = await categoriesApi.getById(id);
        confirmAction(`Вы уверены, что хотите удалить магазин "${category.name}"? Это действие нельзя отменить.`, async () => {
            try {
                await categoriesApi.delete(id);
                this.loadCategories();
                showNotification('Категория удалена', 'success');
            } catch (error) {
                showNotification(`Ошибка удаления: ${error.message}`, 'error');
            }
        });
    }

    handleSave = async (e) => {
        e.preventDefault();
        const formData = {
            ...this.getFormData(),
            image_id: this.selectedImageId || null
        };

        try {
            if (formData.id) {
                await categoriesApi.update(formData.id, formData);
            } else {
                await categoriesApi.create(formData);
            }
            closeModal(this.domElements.categoryModal);
            this.loadCategories();
            showNotification('Данные сохранены', 'success');
        } catch (error) {
            showNotification(`Ошибка сохранения: ${error.message}`, 'error');
        }
    }

    getFormData() {
        return {
            id: document.getElementById('category-id').value,
            name: document.getElementById('category-name').value,
            description: document.getElementById('category-description').value,
            image_id: this.selectedImageId,
            status: document.getElementById('category-status').checked
        };
    }

    fillForm(category) {
        document.getElementById('category-id').value = category.id;
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-description').value = category.description || '';
        document.getElementById('category-status').checked = category.status;
        this.selectedImageId = category.image_id;
    }

    openCategoryForm() {
        document.getElementById('category-id').value = '';
        resetForm(this.domElements.categoryForm);
        this.selectedImageId = null;
        this.renderImageGallery();
        openModal(this.domElements.categoryModal);
    }
}
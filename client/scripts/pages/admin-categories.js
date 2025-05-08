import { 
    showNotification, 
    openModal, 
    closeModal, 
    confirmAction,
    clearTable
} from '../utils/helper.js';

// Класс для работы с API
class ApiClient {
    constructor(baseUrl = 'http://localhost:8000/api/v1') {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json'
        };
    }

    async get(endpoint) {
        try {
            console.log(`Выполняем GET запрос к ${this.baseUrl}${endpoint}`);
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: this.headers,
                // CORS должен быть настроен на сервере, не используем опцию mode
                // mode: 'cors'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка GET запроса: ${error.message}`);
            throw error;
        }
    }

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.headers,
                // mode: 'cors',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка POST запроса: ${error.message}`);
            throw error;
        }
    }

    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.headers,
                // mode: 'cors',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка PUT запроса: ${error.message}`);
            throw error;
        }
    }

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.headers,
                // mode: 'cors'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка DELETE запроса: ${error.message}`);
            throw error;
        }
    }
}

// Создаем экземпляр ApiClient
const apiClient = new ApiClient('http://localhost:8000/api/v1');

// Элементы DOM
const categoryModal = document.getElementById('category-modal');
const confirmModal = document.getElementById('confirm-modal');
const addCategoryBtn = document.getElementById('add-category-btn');
const saveCategoryBtn = document.getElementById('save-category-btn');
const categoryForm = document.getElementById('category-form');
const categoryStatusFilter = document.getElementById('category-status-filter');
const tableBody = document.querySelector('.data-table tbody');
const searchInput = document.querySelector('.search-input');

/**
 * Загрузка категорий с сервера
 */
async function loadCategories() {
    try {
        const response = await apiClient.get('/finance/categories/with-images');
        renderCategories(response);
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
        showNotification('Не удалось загрузить категории. Проверьте работу сервера и наличие соединения.', 'error');
        
        // Отображаем пустую таблицу в случае ошибки
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Не удалось загрузить категории. Ошибка: ${error.message}</td>
            </tr>
        `;
    }
}

/**
 * Отрисовка таблицы категорий
 */
function renderCategories(categories) {
    // Получаем активный фильтр
    const statusFilter = categoryStatusFilter.value;
    
    // Фильтруем категории, если нужно
    let filteredCategories = categories;
    if (statusFilter === 'active') {
        filteredCategories = categories.filter(category => category.status);
    } else if (statusFilter === 'inactive') {
        filteredCategories = categories.filter(category => !category.status);
    }
    
    // Получаем поисковый запрос
    const searchQuery = searchInput.value.toLowerCase().trim();
    if (searchQuery) {
        filteredCategories = filteredCategories.filter(category => 
            category.name.toLowerCase().includes(searchQuery) || 
            (category.description && category.description.toLowerCase().includes(searchQuery))
        );
    }
    
    // Очищаем таблицу
    clearTable(tableBody);
    
    // Если категорий нет или все отфильтрованы
    if (filteredCategories.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" class="text-center">Категории не найдены</td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Добавляем строки для каждой категории
    filteredCategories.forEach(category => {
        const row = document.createElement('tr');
        row.className = 'category-row';
        
        // Создаем SVG-изображение или заглушку
        let svgContent = '-';
        if (category.image && category.image.svg_data) {
            // Обернем SVG в контейнер с фиксированными размерами
            svgContent = `
                <div class="category-icon" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                        <path d="${category.image.svg_data}"></path>
                    </svg>
                </div>
            `;
        }
        
        row.innerHTML = `
            <td data-label="Название">
                <div class="category-cell">
                    <div class="category-name">${category.name}</div>
                </div>
            </td>
            <td data-label="Описание">${category.description || '-'}</td>
            <td data-label="Изображение">${svgContent}</td>
            <td data-label="Статус"><span class="status status-${category.status ? 'active' : 'inactive'}">${category.status ? 'Активна' : 'Неактивна'}</span></td>
            <td data-label="Действия">
                <div class="actions-cell">
                    <button class="row-action edit-category-btn" data-id="${category.id}">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                    </button>
                    <button class="row-action delete-category-btn" data-id="${category.id}">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Добавляем обработчики для новых кнопок
    attachEditButtonListeners();
    attachDeleteButtonListeners();
}

/**
 * Загрузка изображений и создание галереи для выбора
 */
async function loadImagesForSelect() {
    try {
        const response = await apiClient.get('/finance/images');
        
        // Находим контейнер для изображений
        let imageGallery = document.getElementById('image-gallery');
        let imageIdInput = document.getElementById('category-image');
        
        // Если контейнера нет, создаём его
        if (!imageGallery) {
            // Найдём родительский элемент для выпадающего списка
            const selectParent = document.getElementById('category-image').parentNode;
            
            // Скрываем стандартный select
            imageIdInput.style.display = 'none';
            
            // Создаём контейнер для галереи
            imageGallery = document.createElement('div');
            imageGallery.id = 'image-gallery';
            imageGallery.className = 'image-gallery';
            imageGallery.style.display = 'grid';
            imageGallery.style.gridTemplateColumns = 'repeat(4, 1fr)';
            imageGallery.style.gap = '10px';
            imageGallery.style.marginTop = '10px';
            
            // Добавляем контейнер в DOM после label
            selectParent.appendChild(imageGallery);
            
            // Добавляем стиль для выбранного изображения
            const style = document.createElement('style');
            style.textContent = `
                .image-item {
                    cursor: pointer;
                    border: 2px solid transparent;
                    border-radius: 8px;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    transition: all 0.2s ease;
                }
                .image-item:hover {
                    background-color: rgba(79, 70, 229, 0.1);
                }
                .image-item.selected {
                    border-color: var(--primary);
                    background-color: rgba(79, 70, 229, 0.1);
                }
                .image-item .image-name {
                    margin-top: 5px;
                    font-size: 12px;
                    text-align: center;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Очищаем галерею
        imageGallery.innerHTML = '';
        
        // Добавляем опцию "Без изображения"
        const noImageItem = document.createElement('div');
        noImageItem.className = 'image-item';
        noImageItem.dataset.id = '';
        noImageItem.innerHTML = `
            <div class="category-icon" style="width: 60px; height: 60px; background-color: #f3f4f6;">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor">
                    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-9 15H5v-4h5v4zm9 0h-7v-4h7v4zm0-6H5V5h14v7z" stroke-width="1"></path>
                </svg>
            </div>
            <div class="image-name">Без изображения</div>
        `;
        imageGallery.appendChild(noImageItem);
        
        // Если у элемента нет выбранного значения, делаем "Без изображения" выбранным
        if (!imageIdInput.value) {
            noImageItem.classList.add('selected');
        }
        
        // Добавляем изображения в галерею
        response.forEach(image => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.id = image.id;
            
            // Если это выбранное изображение, добавляем класс selected
            if (image.id === imageIdInput.value) {
                imageItem.classList.add('selected');
            }
            
            imageItem.innerHTML = `
                <div class="category-icon" style="width: 60px; height: 60px;">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                        <path d="${image.svg_data}"></path>
                    </svg>
                </div>
                <div class="image-name">${image.name || `Изображение #${image.id.substring(0, 4)}`}</div>
            `;
            
            imageGallery.appendChild(imageItem);
        });
        
        // Добавляем обработчик клика для выбора изображения
        imageGallery.querySelectorAll('.image-item').forEach(item => {
            item.addEventListener('click', function() {
                // Убираем класс selected у всех элементов
                imageGallery.querySelectorAll('.image-item').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Добавляем класс selected к выбранному элементу
                this.classList.add('selected');
                
                // Обновляем значение скрытого input
                imageIdInput.value = this.dataset.id;
                
                // Генерируем событие change для select, чтобы другие обработчики могли среагировать
                const event = new Event('change');
                imageIdInput.dispatchEvent(event);
            });
        });
        
    } catch (error) {
        console.error('Ошибка при загрузке изображений:', error);
        showNotification('Не удалось загрузить изображения. Проверьте работу сервера и наличие соединения.', 'error');
    }
}

/**
 * Прикрепление обработчиков к кнопкам редактирования
 */
function attachEditButtonListeners() {
    const editButtons = document.querySelectorAll('.edit-category-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const categoryId = button.getAttribute('data-id');
            document.querySelector('.modal-title').textContent = 'Редактировать категорию';
            
            try {
                // Загружаем данные категории
                const category = await apiClient.get(`/finance/categories/${categoryId}`);
                
                // Заполняем форму
                document.getElementById('category-id').value = category.id;
                document.getElementById('category-name').value = category.name;
                document.getElementById('category-description').value = category.description || '';
                document.getElementById('category-status').checked = category.status;
                
                // Загружаем изображения и выбираем нужное
                await loadImagesForSelect();
                
                if (category.image_id) {
                    document.getElementById('category-image').value = category.image_id;
                    
                    // Запускаем событие изменения выбора изображения, чтобы обновить превью
                    const imageSelect = document.getElementById('category-image');
                    const event = new Event('change');
                    imageSelect.dispatchEvent(event);
                } else {
                    document.getElementById('category-image').value = '';
                }
                
                openModal(categoryModal);
            } catch (error) {
                console.error('Ошибка при загрузке категории:', error);
                showNotification('Не удалось загрузить данные категории', 'error');
            }
        });
    });
}

/**
 * Прикрепление обработчиков к кнопкам удаления
 */
function attachDeleteButtonListeners() {
    const deleteButtons = document.querySelectorAll('.delete-category-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const categoryId = button.getAttribute('data-id');
            const categoryName = button.closest('tr').querySelector('.category-name').textContent;
            
            // Используем функцию confirmAction из helper.js
            confirmAction(
                `Вы уверены, что хотите удалить категорию "${categoryName}"? Это действие нельзя отменить.`,
                async () => {
                    try {
                        await apiClient.delete(`/finance/categories/${categoryId}`);
                        showNotification('Категория успешно удалена', 'success');
                        loadCategories();
                    } catch (error) {
                        console.error('Ошибка при удалении категории:', error);
                        showNotification('Не удалось удалить категорию', 'error');
                    }
                }
            );
        });
    });
}

/**
 * Сохранение категории (добавление или обновление)
 */
async function saveCategory() {
    if (!categoryForm.checkValidity()) {
        categoryForm.reportValidity();
        return;
    }
    
    const categoryId = document.getElementById('category-id').value;
    const categoryData = {
        name: document.getElementById('category-name').value,
        description: document.getElementById('category-description').value || null,
        image_id: document.getElementById('category-image').value || null,
        status: document.getElementById('category-status').checked
    };
    
    try {
        if (categoryId) {
            // Обновление существующей категории
            await apiClient.put(`/finance/categories/${categoryId}`, categoryData);
            showNotification('Категория успешно обновлена', 'success');
        } else {
            // Создание новой категории
            await apiClient.post('/finance/categories', categoryData);
            showNotification('Категория успешно создана', 'success');
        }
        
        closeModal(categoryModal);
        loadCategories();
    } catch (error) {
        console.error('Ошибка при сохранении категории:', error);
        showNotification('Не удалось сохранить категорию', 'error');
    }
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка данных
    loadCategories();
    loadImagesForSelect();
    
    // Обработчик для кнопки добавления категории
    addCategoryBtn.addEventListener('click', () => {
        document.querySelector('.modal-title').textContent = 'Добавить категорию';
        categoryForm.reset();
        document.getElementById('category-id').value = '';
        document.getElementById('category-status').checked = true;
        openModal(categoryModal);
    });
    
    // Обработчик для кнопки сохранения
    saveCategoryBtn.addEventListener('click', saveCategory);
    
    // Обработчик фильтра по статусу
    categoryStatusFilter.addEventListener('change', () => {
        loadCategories();
    });
    
    // Обработчик поиска
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadCategories();
        }, 300);
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(button => {
        button.addEventListener('click', () => {
            closeModal(button.closest('.modal'));
        });
    });
}); 
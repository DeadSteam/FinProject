/**
 * Вспомогательные функции для работы с интерфейсом
 */

// Функция для отображения уведомлений
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">${message}</div>
        <button class="notification-close">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие уведомления через 3 секунды
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
    
    // Обработка кнопки закрытия
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
}

// Функция для показа диалога подтверждения действия
export function confirmAction(message, confirmCallback, cancelCallback = null) {
    const confirmModal = document.getElementById('confirm-modal');
    if (!confirmModal) {
        console.error('Модальное окно подтверждения не найдено');
        return;
    }
    
    const modalBody = confirmModal.querySelector('.modal-body p');
    modalBody.textContent = message;
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = confirmModal.querySelector('.modal-cancel');
    
    // Удаляем предыдущие обработчики с кнопки подтверждения
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Удаляем предыдущие обработчики с кнопки отмены
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Добавляем новый обработчик для подтверждения
    newConfirmBtn.addEventListener('click', function() {
        closeModal(confirmModal);
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // Добавляем новый обработчик для отмены
    newCancelBtn.addEventListener('click', function() {
        closeModal(confirmModal);
        if (typeof cancelCallback === 'function') {
            cancelCallback();
        }
    });
    
    openModal(confirmModal);
}

// Функция для открытия модального окна
export function openModal(modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

// Функция для закрытия модального окна
export function closeModal(modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
}


// Функция для получения статуса в удобном для отображения виде
export function getStatusBadge(status) {
    return status 
        ? '<span class="status status-active">Активен</span>' 
        : '<span class="status status-inactive">Неактивен</span>';
}

// Функция для генерации HTML строки таблицы магазина
export function generateShopTableRow(shop) {
    return `
    <tr data-id="${shop.id}">
        <td data-label="Магазин">
            <div class="shop-cell">
                <div class="shop-name">${shop.name}</div>
                <div class="shop-code">Штат: ${shop.number_of_staff} чел.</div>
            </div>
        </td>
        <td data-label="Адрес">${shop.address || 'Не указан'}</td>
        <td data-label="Описание">${shop.description || 'Нет описания'}</td>
        <td data-label="Статус">${getStatusBadge(shop.status)}</td>
        <td data-label="Действия">
            <div class="actions-cell">
                <button class="row-action edit-shop-btn" data-id="${shop.id}">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                </button>
                <button class="row-action delete-shop-btn" data-id="${shop.id}">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </td>
    </tr>
    `;
}

// Функция для генерации HTML строки таблицы пользователя
export function generateUserTableRow(user) {
    return `
    <tr data-id="${user.id}">
        <td data-label="Пользователь">
            <div class="user-cell">
                <div class="user-email">${user.email || ''}</div>
            </div>
        </td>
        <td data-label="Логин">${user.username}</td>
        <td data-label="Роль">${user.role ? user.role.name : 'Не назначена'}</td>
        <td data-label="Статус">${getStatusBadge(user.status)}</td>
        <td data-label="Действия">
            <div class="actions-cell">
                <button class="row-action edit-user-btn" data-id="${user.id}">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                </button>
                <button class="row-action delete-user-btn" data-id="${user.id}">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </td>
    </tr>
    `;
}

// Функция для очистки таблицы
export function clearTable(tableBody) {
    tableBody.innerHTML = '';
}

// Функция для заполнения таблицы данными
export function populateTable(tableBody, items, rowGenerator) {
    clearTable(tableBody);
    
    if (!items || items.length === 0) {
        const emptyRow = document.createElement('tr');
        // Определяем количество столбцов на основе первой строки заголовка таблицы
        const headerCells = tableBody.closest('table').querySelectorAll('thead th');
        const colSpan = headerCells.length || 5;
        emptyRow.innerHTML = `<td colspan="${colSpan}" class="text-center">Нет данных для отображения</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    items.forEach(item => {
        tableBody.insertAdjacentHTML('beforeend', rowGenerator(item));
    });
}

// Функция для сброса формы и очистки полей валидации
export function resetForm(form) {
    form.reset();
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
        const feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = '';
        }
    });
}

// Функция для генерации HTML строки таблицы метрики
export function generateMetricTableRow(metric) {
    console.log('Генерация строки для метрики:', metric);
    
    // Получаем имя категории, учитывая разные варианты представления данных с сервера
    let categoryName = 'Не указана';
    
    if (metric.category) {
        if (typeof metric.category === 'object') {
            // Проверяем, что объект категории имеет поле name
            if (metric.category.name) {
                categoryName = metric.category.name;
            }
        } else if (typeof metric.category === 'string') {
            // Если категория - это строка, используем её
            categoryName = metric.category;
        }
    } else if (metric.category_name) {
        // Если есть отдельное поле с названием категории
        categoryName = metric.category_name;
    }
    
    // Добавим проверку пустых строк
    if (categoryName.trim() === '') {
        categoryName = 'Не указана';
    }
    
    console.log('Имя категории для метрики:', categoryName);

    return `
    <tr data-id="${metric.id}">
        <td data-label="Название">${metric.name}</td>
        <td data-label="Категория">${categoryName}</td>
        <td data-label="Единица измерения">${metric.unit || 'Не указана'}</td>
        <td data-label="Действия">
            <div class="actions-cell">
                <button class="row-action edit-metric-btn" data-id="${metric.id}">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                </button>
                <button class="row-action delete-metric-btn" data-id="${metric.id}">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </td>
    </tr>
    `;
}

// Функция для отображения уведомлений
export function showToast(message, type = 'success') {
    let toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Добавляем иконку в зависимости от типа уведомления
    let icon = '';
    if (type === 'success') {
        icon = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon = '<i class="fas fa-exclamation-circle"></i>';
    } else if (type === 'warning') {
        icon = '<i class="fas fa-exclamation-triangle"></i>';
    } else if (type === 'info') {
        icon = '<i class="fas fa-info-circle"></i>';
    }

    toast.innerHTML = `<div class="toast-content">${icon}<span>${message}</span></div><button class='toast-close'>&times;</button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    toast.querySelector('.toast-close').onclick = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    };
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
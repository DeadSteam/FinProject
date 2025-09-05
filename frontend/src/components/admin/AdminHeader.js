

import styles from '../../styles/pages/Admin.module.css';
import Button from '../ui/Button';
import React from "react";

/**
 * Заголовок админской страницы с поиском и действиями
 */
function AdminHeader({ 
    title, 
    searchValue, 
    onSearchChange, 
    onAddClick, 
    addButtonText = "Добавить", 
    onToggleSidebar,
    additionalButtons, // Дополнительные кнопки
    children 
}) {
    return (
        <>
            {/* Верхняя панель */}
            <div className={styles.topbar}>
                <h1 className={styles.pageTitle}>{title}</h1>
                
                <div className={styles.topbarActions}>
                    <button className={styles.mobileSidebarToggle} onClick={onToggleSidebar}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                    
                    <div className={styles.searchBar}>
                        <input 
                            type="text" 
                            className={styles.searchInput} 
                            placeholder="Поиск..."
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                        <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Контролы */}
            <div className={styles.controlsContainer}>
                <div className={styles.actionButtons}>
                    {/* Дополнительные кнопки */}
                    {additionalButtons}
                    
                    {/* Основная кнопка добавления */}
                    <Button onClick={onAddClick} variant="primary">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        {addButtonText}
                    </Button>
                </div>
                
                {/* Дополнительные элементы управления */}
                {children}
            </div>
        </>
    );
}

export default React.memo(AdminHeader);
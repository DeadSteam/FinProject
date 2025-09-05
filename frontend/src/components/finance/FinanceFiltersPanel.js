import PropTypes from 'prop-types';
import React from 'react';

import styles from '../../styles/pages/FinanceDetails.module.css';
import Button from '../ui/Button';

/**
 * Компонент панели фильтров для финансовых данных
 * Ответственность: фильтрация и экспорт данных
 * Соблюдает принципы SRP и OCP - легко расширяется новыми фильтрами
 */
const FinanceFiltersPanel = ({
    years,
    shops,
    selectedYear,
    selectedShop,
    onYearChange,
    onShopChange,
    onExport,
    showExport = true,
    className = '',
    customFilters = null
}) => {
    return (
        <div className={`${styles.salaryFilters} ${className}`}>
            {/* Фильтр по году */}
            <select 
                className={styles.filterSelect}
                value={selectedYear}
                onChange={(e) => onYearChange(e.target.value)}
                aria-label="Выбор года"
            >
                {(Array.isArray(years) ? years : []).map(year => {
                    // Обрабатываем как объекты, так и числа
                    const yearValue = typeof year === 'object' && year !== null ? year.year : year;
                    const yearKey = typeof year === 'object' && year !== null ? year.id || year.year : year;
                    return (
                        <option key={yearKey} value={yearValue}>{yearValue}</option>
                    );
                })}
            </select>
            
            {/* Фильтр по магазину */}
            <select 
                className={styles.filterSelect}
                value={selectedShop}
                onChange={(e) => onShopChange(e.target.value)}
                aria-label="Выбор магазина"
            >
                <option value="all">Все магазины</option>
                {(Array.isArray(shops) ? shops : []).map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
            </select>
            
            {/* Дополнительные фильтры */}
            {customFilters && (
                <div className={styles.customFilters}>
                    {customFilters}
                </div>
            )}
            
            {/* Кнопка экспорта */}
            {showExport && (
                <Button 
                    onClick={onExport}
                    variant="primary"
                    size="small"
                    className={styles.exportBtn}
                    aria-label="Экспорт данных в Excel"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Экспорт
                </Button>
            )}
        </div>
    );
};

FinanceFiltersPanel.propTypes = {
    years: PropTypes.array.isRequired,
    shops: PropTypes.array.isRequired,
    selectedYear: PropTypes.string.isRequired,
    selectedShop: PropTypes.string.isRequired,
    onYearChange: PropTypes.func.isRequired,
    onShopChange: PropTypes.func.isRequired,
    onExport: PropTypes.func,
    showExport: PropTypes.bool,
    className: PropTypes.string,
    customFilters: PropTypes.node
};

export default FinanceFiltersPanel; 
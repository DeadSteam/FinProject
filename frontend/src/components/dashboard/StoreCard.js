import React from 'react';
import styles from '../../styles/pages/Dashboard.module.css';
import { formatCurrency } from '../../utils/formatUtils.js';

/**
 * Карточка магазина с информацией о расходах
 */
function StoreCard({ store, onSelect, disabled = false }) {
    const handleCardClick = () => {
        if (!disabled) {
        onSelect(store);
        }
    };

    const handleButtonClick = (e) => {
        e.stopPropagation();
        if (!disabled) {
        onSelect(store);
        }
    };

    return (
        <div 
            className={`${styles.storeCard} ${disabled ? styles.disabled : ''}`}
            onClick={handleCardClick}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
            <div className={styles.storeCardHeader}>
                <div className={styles.storeIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.371 2.371 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976l2.61-3.045zm1.78 4.275a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 1 0 2.75 0V5.37a.5.5 0 0 0-.12-.325L12.27 2H3.73L1.12 5.045A.5.5 0 0 0 1 5.37v.255a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0M1.5 8.5A.5.5 0 0 1 2 9v6h1v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h6V9a.5.5 0 0 1 1 0v6h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1V9a.5.5 0 0 1 .5-.5M4 15h3v-5H4zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zm3 0h-2v3h2z"/>
                    </svg>
                </div>
                <div className={styles.storeName}>{store.name}</div>
                <div className={styles.storeAmount}>{formatCurrency(store.yearly_actual || 0)}</div>
            </div>
            <div className={styles.storeCardBody}>
                <div className={styles.storeDescription}>{store.description || 'Описание не указано'}</div>
                <div className={styles.storeAddress}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>{store.address || 'Адрес не указан'}</span>
                </div>

                <div className={styles.storeStaff}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>Персонал: {store.number_of_staff || 0} чел.</span>
                </div>
            </div>
            <div className={styles.storeCardFooter}>
                <button 
                    className={`${styles.storeViewReport} ${disabled ? styles.disabled : ''}`} 
                    onClick={handleButtonClick}
                    disabled={disabled}
                    title={disabled ? 'Сначала выберите категорию' : 'Просмотреть отчет'}
                >
                    {disabled ? 'Выберите категорию' : 'Просмотреть отчет'}
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M9 5l7 7-7 7"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default StoreCard; 
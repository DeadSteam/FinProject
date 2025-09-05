import React, { useState, useEffect } from 'react';

import styles from '../../styles/components/LoadingSpinner.module.css';

/**
 * Phase 10 Task 10.3: React.memo оптимизация
 * Компонент спиннера загрузки с debounce эффектом
 * @param {string} size - Размер спиннера (small, medium, large)
 * @param {string} color - Цвет спиннера (primary, secondary, white)
 * @param {string} text - Текст под спиннером
 * @param {number} delay - Задержка перед показом спиннера в мс (по умолчанию 200мс)
 * @param {boolean} immediate - Показать спиннер немедленно без задержки
 */
const LoadingSpinner = React.memo(({ 
    size = 'medium', 
    color = 'primary', 
    text = null, 
    delay = 200,
    immediate = false 
}) => {
    const [shouldShow, setShouldShow] = useState(immediate);
    
    useEffect(() => {
        if (immediate) {
            setShouldShow(true);
            return;
        }
        
        const timer = setTimeout(() => {
            setShouldShow(true);
        }, delay);
        
        return () => clearTimeout(timer);
    }, [delay, immediate]);
    
    if (!shouldShow) {
        return null;
    }
    
    const sizeClass = styles[size] || styles.medium;
    const colorClass = styles[color] || styles.primary;

    return (
        <div className={styles.container}>
            <div className={`${styles.spinner} ${sizeClass} ${colorClass}`}></div>
            {text && <div className={styles.text}>{text}</div>}
        </div>
    );
});

export default LoadingSpinner;

 
 
 
 
 
 

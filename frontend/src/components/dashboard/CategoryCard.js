

import styles from '../../styles/pages/Dashboard.module.css';
import { formatCurrency } from '../../utils/formatUtils.js';
import Card from '../ui/Card.js';

/**
 * Карточка категории с данными о плане и факте
 */
function CategoryCard({ category, isSelected, onSelect }) {
    // Используем реальные данные из аналитики или значения по умолчанию
    const yearlyPlan = category.yearly_plan || 0;
    const yearlyActual = category.yearly_actual || 0;
    const progressPercent = category.yearly_procent || 0;
    
    return (
        <Card 
            key={category.id}
            className={`${styles.categoryCard} ${isSelected ? styles.active : ''}`}
            onClick={() => onSelect(category)}
            clickable
        >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className={styles.categoryIcon}>
                    {category.image ? (
                        <svg className={styles.categoryIconSvg} viewBox="0 0 24 24" fill="currentColor">
                            <path d={category.image}></path>
                        </svg>
                    ) : (
                        <svg className={styles.categoryIconSvg} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                        </svg>
                    )}
                </div>
                <div style={{ textAlign: 'end' }}>
                    <h3 className={styles.categoryTitle}>{category.name}</h3>
                    <p className={styles.categoryDesc}>{category.description || 'Нет описания'}</p>
                </div>
            </div>

            <div className={styles.categoryTiles}>
                <div className={`${styles.budgetTile} ${styles.budgetTilePlan}`}>
                    <div className={styles.tileLabel}>План</div>
                    <div className={styles.tileValue}>{formatCurrency(yearlyPlan)}</div>
                </div>
                <div className={`${styles.budgetTile} ${styles.budgetTileFact}`}>
                    <div className={styles.tileLabel}>Факт</div>
                    <div className={styles.tileValue}>{formatCurrency(yearlyActual)}</div>
                </div>
            </div>

            <div className={styles.categoryInfo}>
                <div className={styles.categoryProgress}>
                    <div className={styles.categoryProgressBar} style={{ width: `${Math.min(progressPercent, 200)}%` }}></div>
                </div>
                <div className={`${styles.categoryStatus} ${progressPercent > 100 ? styles.categoryStatusOverage : ''}`}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d={progressPercent > 100 ? 'M19 14l-7 7m0 0l-7-7m7 7V3' : 'M5 10l7-7m0 0l7 7m-7-7v18'}></path>
                    </svg>
                    {progressPercent > 100 ?
                        `Превышение: ${Math.round(progressPercent - 100)}% (${formatCurrency(yearlyActual - yearlyPlan)})` :
                        `Экономия: ${Math.round(100 - progressPercent)}% (${formatCurrency(yearlyPlan - yearlyActual)})`}
                </div>
                <div className={styles.categoryAction}>Выбрать</div>
            </div>
        </Card>
    );
}

export default CategoryCard; 
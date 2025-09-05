

import styles from '../../styles/pages/Dashboard.module.css';
import { formatCurrency, formatPercent } from '../../utils/formatUtils.js';
import Card from '../ui/Card.js';

/**
 * Обзор бюджета с плановыми и фактическими показателями
 */
function BudgetOverview({ budgetData, quickStats }) {
    return (
        <div className={styles.budgetOverview}>
            <Card className={styles.budgetCard}>
                <div className={styles.budgetHeader}>
                    <div className={styles.budgetTitle}>Бюджет на текущий период</div>
                </div>
                <div className={styles.budgetTiles}>
                    <div className={`${styles.budgetTile} ${styles.budgetTilePlan}`}>
                        <div className={styles.tileLabel}>План</div>
                        <div className={styles.tileValue}>
                            {formatCurrency(budgetData.plan)}
                        </div>
                    </div>
                    <div className={`${styles.budgetTile} ${styles.budgetTileFact}`}>
                        <div className={styles.tileLabel}>Факт</div>
                        <div className={styles.tileValue}>
                            {formatCurrency(budgetData.fact)}
                        </div>
                    </div>
                </div>
                <div className={styles.budgetProgressContainer}>
                    <div className={styles.budgetProgress}>
                        <div 
                            className={styles.budgetProgressBar}
                            style={{ width: `${budgetData.percentage}%` }}
                        ></div>
                    </div>
                    <div className={styles.budgetStatus}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                        </svg>
                        {budgetData.status}
                    </div>
                </div>
            </Card>

            {/* Быстрая статистика */}
            <div className={styles.quickStats}>
                <div className={styles.quickStatItem}>
                    <div className={styles.quickStatValue}>{quickStats.categoriesCount}</div>
                    <div className={styles.quickStatLabel}>Категорий</div>
                </div>
                <div className={styles.quickStatItem}>
                    <div className={styles.quickStatValue}>{quickStats.storesCount}</div>
                    <div className={styles.quickStatLabel}>Магазина</div>
                </div>
                <div className={styles.quickStatItem}>
                    <div className={styles.quickStatValue}>
                        {formatPercent(quickStats.expensePercentage / 100)}
                    </div>
                    <div className={styles.quickStatLabel}>Расходов за год</div>
                </div>
            </div>
        </div>
    );
}

export default BudgetOverview; 
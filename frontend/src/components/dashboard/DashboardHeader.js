

import { DATE_FORMATS } from '../../config/constants.js';
import styles from '../../styles/pages/Dashboard.module.css';
import { formatDate } from '../../utils/formatUtils.js';

/**
 * Заголовок дашборда с текущей датой и кнопкой обновления
 */
function DashboardHeader({ onRefresh, refreshing = false }) {
    const getCurrentDate = () => {
        return formatDate(new Date(), DATE_FORMATS.LONG);
    };

    return (
        <section className={styles.dashboardHeader}>
            <div className={styles.headerContent}>
                <div className={styles.headerText}>
                    <h1 className={styles.pageTitle}>Финансовая аналитика реального времени</h1>
                    <div className={styles.dateDisplay}>{getCurrentDate()}</div>
                        <div className={styles.dashboardSubtitle}>
                            Обзор финансовых показателей и категорий расходов
                        </div>
                </div>
            </div>
        </section>
    );
}

export default DashboardHeader; 
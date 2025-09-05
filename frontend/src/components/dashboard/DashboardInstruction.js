

import styles from '../../styles/pages/Dashboard.module.css';

/**
 * Инструкция для пользователя по работе с дашбордом
 */
function DashboardInstruction({ showInstruction, currentStep, onClose }) {
    if (!showInstruction) {
        return null;
    }

    return (
        <div className={styles.pageInstruction}>
            <div className={`${styles.instructionStep} ${currentStep === 1 ? styles.active : ''}`}>
                <div className={styles.instructionNumber}>1</div>
                <div className={styles.instructionContent}>
                    <div className={styles.instructionTitle}>Выберите категорию расходов</div>
                    <div className={styles.instructionDesc}>Нажмите на одну из категорий расходов ниже</div>
                </div>
            </div>
            <div className={`${styles.instructionStep} ${currentStep === 2 ? styles.active : ''}`}>
                <div className={styles.instructionNumber}>2</div>
                <div className={styles.instructionContent}>
                    <div className={styles.instructionTitle}>Выберите магазин</div>
                    <div className={styles.instructionDesc}>После выбора категории появится список магазинов</div>
                </div>
            </div>
            <div className={`${styles.instructionStep} ${currentStep === 3 ? styles.active : ''}`}>
                <div className={styles.instructionNumber}>3</div>
                <div className={styles.instructionContent}>
                    <div className={styles.instructionTitle}>Просмотрите отчет</div>
                    <div className={styles.instructionDesc}>Перейдите к детальному отчету по выбранным параметрам</div>
                </div>
            </div>
            <button className={styles.instructionClose} onClick={onClose}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    );
}

export default DashboardInstruction; 
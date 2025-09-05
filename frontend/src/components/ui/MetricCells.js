import React, { useState, useEffect } from 'react';
import styles from '@styles/components/DataTable.module.css';

import { formatNumberRu } from '../../utils/formatUtils.js';
import { getDeviationCssClass } from '../../utils/deviationUtils.js';
import DocumentsModal from '../finance/DocumentsModal';
import ReasonModal from '../finance/ReasonModal';
import { useApiQuery } from '../../hooks';
import { API_BASE_URL } from '../../config/api.js';

const MetricCells = ({ row, metric, hasAdminRights, onEditValue }) => {
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [showDocumentsModal, setShowDocumentsModal] = useState(false);
    const [documents, setDocuments] = useState([]);
    const formatNumber = (value) => formatNumberRu(value);
    const getDeviationClass = (variance) => getDeviationCssClass(variance, styles);

    const planValue = row[`metric${metric.id}_plan`];
    const factValue = row[`metric${metric.id}_fact`];
    const variance = row[`metric${metric.id}_variance`];
    const deviation = row[`metric${metric.id}_deviation`];
    const actualValueId = row[`metric${metric.id}_actual_id`];
    const reason = row[`metric${metric.id}_reason`];

    // Загружаем документы, если есть actualValueId
    const documentsQuery = useApiQuery(
        () => fetch(`${API_BASE_URL}/finance/documents/?actual_value_id=${actualValueId}`).then(res => res.json()),
        { enabled: !!actualValueId, executeOnMount: !!actualValueId }
    );

    useEffect(() => {
        if (documentsQuery.data) {
            setDocuments(documentsQuery.data);
        }
    }, [documentsQuery.data]);

    const handleEditClick = (type, currentValue) => {
        if (onEditValue) {
            onEditValue(metric.id, row.periodId, type, currentValue);
        }
    };

    const handleDocumentUpload = (document) => {
        // Обновляем локальный список документов
        setDocuments(prev => [...prev, document]);
    };

    const handleReasonSave = (newReason) => {
        // Обновляем причину в родительском компоненте (если нужно)
        if (row && metric && metric.id) {
            row[`metric${metric.id}_reason`] = newReason;
        }
    };

    return (
        <React.Fragment>
            {/* План */}
            <td className={styles.valueCell}>
                <div className={styles.cellContent}>
                    <span className={styles.value}>
                        {formatNumber(planValue)} {metric.unit}
                    </span>
                    {hasAdminRights && (
                        <button
                            className={`${styles.editBtn} ${styles.editPlanBtn}`}
                            onClick={() => handleEditClick('plan', planValue)}
                            title="Редактировать план"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </td>
            
            {/* Факт */}
            <td className={styles.valueCell}>
                <div className={styles.cellContent}>
                    {factValue > 0 ? (
                        <>
                            <span className={styles.value}>
                                {formatNumber(factValue)} {metric.unit}
                            </span>
                            {hasAdminRights && !row.isQuarter && (
                                <>
                                <button
                                    className={`${styles.editBtn} ${styles.editFactBtn}`}
                                    onClick={() => handleEditClick('fact', factValue)}
                                    title="Редактировать факт"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                                    {actualValueId && (
                                        <button
                                            className={styles.documentBtnBlack}
                                            onClick={() => setShowDocumentsModal(true)}
                                            title="Документы"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 512 512" fill="none" stroke="currentColor">
                                                <path d="M 256 512 l -204 0 c -28.719 0 -52 -23.281 -52 -52 l 0 -328 c 0 -28.719 23.281 -52 52 -52 l 44 0 l 0 -8 c 0 -39.765 32.236 -72 72 -72 c 39.764 0 72 32.236 72 72 l 0 8 l 124 0 c 28.719 0 52 23.281 52 52 l 0 220 l -0.296 0 c -1.259 11.755 -6.497 22.793 -14.934 31.23 l -113.54 113.54 c -8.437 8.437 -19.475 13.675 -31.23 14.934 l 0 0.296 Z m -160 -400 l -44 0 c -11.071 0.025 -20 8.97 -20 20 l 0 328 c 0 11.046 8.954 20 20 20 l 172 0 l 0 -96 c 0 -35.346 28.654 -64 64 -64 l 96 0 l 0 -188 c 0 -11.03 -8.929 -19.975 -20 -20 l -236 0 l 0 152 c 0 13.255 10.745 24 24 24 c 13.255 0 24 -10.745 24 -24 l 0 -120 l 32 0 l 0 120 c 0 30.928 -25.072 56 -56 56 c -30.928 0 -56 -25.072 -56 -56 l 0 -152 Z m 160 367.218 c 3.222 -0.929 6.189 -2.662 8.603 -5.076 l 113.539 -113.539 c 2.414 -2.414 4.147 -5.381 5.076 -8.603 l -95.218 0 c -17.673 0 -32 14.327 -32 32 l 0 95.218 Z m -48 -399.218 l 0 -8 c 0 -22.091 -17.909 -40 -40 -40 c -22.091 0 -40 17.909 -40 40 l 0 8 l 80 0 Z"
                                                    fill="none" stroke="currentColor" strokeWidth="24"/>
                                            </svg>
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        hasAdminRights && !row.isQuarter ? (
                            <button
                                className={styles.addFactBtn}
                                onClick={() => handleEditClick('fact', 0)}
                                title="Внести факт"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" stroke="white" fill="none">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                                </svg>
                                Внести факт
                            </button>
                        ) : (
                            <span className={styles.emptyValue}>—</span>
                        )
                    )}
                </div>
            </td>
            
            {/* Отклонение */}
            <td className={`${styles.deviationCell} ${factValue > 0 ? getDeviationClass(variance) : ''}`}>
                {factValue > 0 ? (
                    <div className={styles.deviationContent}>
                    <div className={styles.deviationValue}>
                        <div className={styles.deviationAmount}>
                            {(() => {
                                const diff = factValue - planValue;
                                    const sign = diff > 0 ? '+' : '';
                                return `${sign}${formatNumber(Math.abs(diff))} ${metric.unit}`;
                            })()}
                        </div>
                        <div className={styles.deviationPercent}>
                            ({deviation}%)
                        </div>
                        </div>
                        
                        {/* Кнопка для добавления причины отклонения */}
                        {hasAdminRights && actualValueId && (
                            <button
                                className={
                                    `${styles.reasonBtn} ` +
                                    ((factValue - planValue) > 0
                                        ? styles.reasonNegative
                                        : (factValue - planValue) < 0
                                            ? styles.reasonPositive
                                            : '') +
                                    (reason ? ' ' + styles.hasReason : '')
                                }
                                onClick={() => setShowReasonModal(true)}
                                title={reason || 'Добавить причину'}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M18.5 5.5h-4a1 1 0 0 0 0 2h4a1 1 0 0 1 1 1v9.72l-1.57-1.45a1 1 0 0 0-0.68-0.27H8.5a1 1 0 0 1-1-1v-1a1 1 0 0 0-2 0v1a3 3 0 0 0 3 3h8.36l3 2.73a1 1 0 0 0 0.68 0.27a1.1 1.1 0 0 0 0.4-0.08a1 1 0 0 0 0.6-0.92V8.5A3 3 0 0 0 18.5 5.5Zm-9.42 7H11.5a1 1 0 0 0 1-1V9.08a1 1 0 0 0-0.29-0.71L6.63 2.79a1 1 0 0 0-1.41 0L2.79 5.22a1 1 0 0 0 0 1.41l5.58 5.58A1 1 0 0 0 9.08 12.5ZM5.92 4.91L10.5 9.49v1h-1L4.91 5.92Z"/>
                                </svg>
                            </button>
                        )}
                        
                        {/* Модальное окно для причины отклонения */}
                        {actualValueId && (
                            <ReasonModal
                                isOpen={showReasonModal}
                                onClose={() => setShowReasonModal(false)}
                                actualValueId={actualValueId}
                                currentReason={reason}
                                onSave={handleReasonSave}
                            />
                        )}
                        
                        {/* Модальное окно для документов */}
                        {actualValueId && (
                            <DocumentsModal
                                isOpen={showDocumentsModal}
                                onClose={() => setShowDocumentsModal(false)}
                                actualValueId={actualValueId}
                                onUpload={handleDocumentUpload}
                            />
                        )}
                    </div>
                ) : (
                    <span className={styles.emptyValue}>—</span>
                )}
            </td>
        </React.Fragment>
    );
};

export default MetricCells; 
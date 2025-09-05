import React, { useState } from 'react';
import { useNotifications } from '../../hooks';
import Modal from '../modals/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import reportsService from '../../services/reportsService';
import './ReportExporter.css';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Компонент для экспорта отчетов в различные форматы.
 * Поддерживает экспорт в PDF, PowerPoint и JSON.
 */
const ReportExporter = ({ report, isOpen, onClose }) => {
    const { showSuccess, showError, showInfo } = useNotifications();
    
    const [exportFormat, setExportFormat] = useState('pdf');
    const [exportOptions, setExportOptions] = useState({
        includeData: true,
        orientation: 'landscape',
        format: 'a4',
        template: null,
        quality: 'high'
    });
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    // Доступные форматы экспорта
    const exportFormats = [
        {
            id: 'pdf',
            name: 'PDF документ',
            description: 'Портативный документ для печати и просмотра',
            extension: 'pdf',
            clientSide: true
        },
        {
            id: 'pptx',
            name: 'PowerPoint презентация',
            description: 'Презентация для редактирования в PowerPoint',
            extension: 'pptx',
            clientSide: true
        },
        {
            id: 'json',
            name: 'JSON данные',
            description: 'Структурированные данные для интеграции',
            extension: 'json',
            clientSide: false
        }
    ];

    // Обработчик экспорта
    const handleExport = async () => {
        if (!report || !report.slides || report.slides.length === 0) {
            showError('Нет слайдов для экспорта');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        try {
            const selectedFormat = exportFormats.find(f => f.id === exportFormat);
            
            if (selectedFormat.clientSide) {
                // Клиентский экспорт
                await handleClientSideExport(selectedFormat);
            } else {
                // Серверный экспорт
                await handleServerSideExport(selectedFormat);
            }

            showSuccess(`Отчет успешно экспортирован в формат ${selectedFormat.name}`);
            onClose();
            
        } catch (error) {
            if (dev) console.error('Export error:', error);
            showError(error.message || 'Ошибка экспорта отчета');
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    };

    // Клиентский экспорт
    const handleClientSideExport = async (format) => {
        setExportProgress(20);

        if (format.id === 'pdf') {
            // Экспорт в PDF через jsPDF
            const pdf = await reportsService.generateClientPDF(report, exportOptions);
            setExportProgress(80);
            
            // Скачиваем файл
            const filename = `${report.title || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
        } else if (format.id === 'pptx') {
            // Экспорт в PowerPoint через PptxGenJS
            const pptx = await reportsService.generateClientPPTX(report, exportOptions);
            setExportProgress(80);
            
            // Скачиваем файл
            const filename = `${report.title || 'report'}_${new Date().toISOString().split('T')[0]}.pptx`;
            await pptx.writeFile({ fileName: filename });
        }

        setExportProgress(100);
    };

    // Серверный экспорт
    const handleServerSideExport = async (format) => {
        setExportProgress(30);

        const exportRequest = {
            report_id: report.id,
            format: format.id,
            include_data: exportOptions.includeData,
            template: exportOptions.template
        };

        if (format.id === 'pdf') {
            const result = await reportsService.exportToPDF(report.id, exportOptions);
            setExportProgress(70);
            
            // Скачиваем файл
            await reportsService.downloadExport(result.download_url);
            
        } else if (format.id === 'pptx') {
            const result = await reportsService.exportToPPTX(report.id, exportOptions);
            setExportProgress(70);
            
            // Скачиваем файл
            await reportsService.downloadExport(result.download_url);
        }

        setExportProgress(100);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Экспорт отчета"
            size="lg"
            className="report-exporter-modal"
        >
            <div className="report-exporter">
                {/* Информация об отчете */}
                <div className="export-report-info">
                    <h6>{report?.title || 'Без названия'}</h6>
                    <p className="text-muted">
                        {report?.slides?.length || 0} слайдов
                        {report?.description && ` • ${report.description}`}
                    </p>
                </div>

                {/* Выбор формата */}
                <div className="export-format-selection">
                    <h6 className="mb-3">Формат экспорта</h6>
                    <div className="format-grid">
                        {exportFormats.map(format => (
                            <div
                                key={format.id}
                                className={`format-option ${exportFormat === format.id ? 'active' : ''}`}
                                onClick={() => setExportFormat(format.id)}
                            >
                                <div className="format-icon">{format.icon}</div>
                                <div className="format-info">
                                    <div className="format-name">{format.name}</div>
                                    <div className="format-description">{format.description}</div>
                                </div>
                                <div className="format-check">
                                    {exportFormat === format.id && (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <polyline points="20,6 9,17 4,12"/>
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Настройки экспорта */}
                <div className="export-options">
                    <h6 className="mb-3">Настройки экспорта</h6>
                    
                    {exportFormat === 'pdf' && (
                        <div className="pdf-options">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Ориентация</label>
                                    <select
                                        className="form-select"
                                        value={exportOptions.orientation}
                                        onChange={(e) => setExportOptions({
                                            ...exportOptions,
                                            orientation: e.target.value
                                        })}
                                    >
                                        <option value="landscape">Альбомная</option>
                                        <option value="portrait">Книжная</option>
                                    </select>
                                </div>
                                
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Формат страницы</label>
                                    <select
                                        className="form-select"
                                        value={exportOptions.format}
                                        onChange={(e) => setExportOptions({
                                            ...exportOptions,
                                            format: e.target.value
                                        })}
                                    >
                                        <option value="a4">A4</option>
                                        <option value="a3">A3</option>
                                        <option value="letter">Letter</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {exportFormat === 'pptx' && (
                        <div className="pptx-options">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Качество изображений</label>
                                    <select
                                        className="form-select"
                                        value={exportOptions.quality}
                                        onChange={(e) => setExportOptions({
                                            ...exportOptions,
                                            quality: e.target.value
                                        })}
                                    >
                                        <option value="high">Высокое</option>
                                        <option value="medium">Среднее</option>
                                        <option value="low">Низкое</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Общие настройки */}
                    <div className="common-options">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="includeData"
                                checked={exportOptions.includeData}
                                onChange={(e) => setExportOptions({
                                    ...exportOptions,
                                    includeData: e.target.checked
                                })}
                            />
                            <label className="form-check-label" htmlFor="includeData">
                                Включить исходные данные
                            </label>
                        </div>
                    </div>
                </div>

                {/* Прогресс экспорта */}
                {isExporting && (
                    <div className="export-progress">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted">Экспорт в процессе...</span>
                            <span className="text-muted">{exportProgress}%</span>
                        </div>
                        <div className="progress">
                            <div
                                className="progress-bar"
                                style={{ width: `${exportProgress}%` }}
                                role="progressbar"
                                aria-valuenow={exportProgress}
                                aria-valuemin="0"
                                aria-valuemax="100"
                            />
                        </div>
                    </div>
                )}

                {/* Кнопки управления */}
                <div className="export-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={isExporting}
                    >
                        Отмена
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={isExporting || !report?.slides?.length}
                    >
                        {isExporting ? (
                            <>
                                <LoadingSpinner size="small" className="me-2" />
                                Экспортирую...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="me-2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7,10 12,15 17,10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Экспортировать
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ReportExporter;

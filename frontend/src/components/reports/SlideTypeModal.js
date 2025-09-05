import React, { useState, useMemo } from 'react';
import './SlideTypeModal.css';

/**
 * Модальное окно для выбора типа слайда
 */
const SlideTypeModal = ({ 
    isOpen, 
    onClose, 
    onSelectSlideType 
}) => {
    const [selectedType, setSelectedType] = useState(null);

    // Все доступные типы слайдов
    const slideTypes = [
        {
            id: 'title',
            name: 'Титульный слайд',
            description: 'Заголовок и описание отчета',
            icon: '📄',
            category: 'Основные'
        },
        {
            id: 'analytics-chart',
            name: 'График аналитики',
            description: 'Визуализация данных аналитики',
            icon: '📊',
            category: 'Графики'
        },
        {
            id: 'finance-chart',
            name: 'Финансовый график',
            description: 'График финансовых показателей',
            icon: '💰',
            category: 'Графики'
        },
        {
            id: 'analytics-table',
            name: 'Таблица аналитики',
            description: 'Табличное представление данных',
            icon: '📋',
            category: 'Таблицы'
        },
        {
            id: 'finance-table',
            name: 'Финансовая таблица',
            description: 'Таблица финансовых данных',
            icon: '📊',
            category: 'Таблицы'
        },
        {
            id: 'comparison',
            name: 'Сравнение',
            description: 'Сравнительный анализ данных',
            icon: '⚖️',
            category: 'Анализ'
        },
        {
            id: 'trends',
            name: 'Тренды',
            description: 'Анализ трендов и динамики',
            icon: '📈',
            category: 'Анализ'
        },
        {
            id: 'plan-vs-actual',
            name: 'План vs Факт',
            description: 'Сравнение плановых и фактических показателей',
            icon: '🎯',
            category: 'Анализ'
        }
    ];

    // Вкладки категорий как на макете (без иконок)
    const tabs = useMemo(() => (
        ['Все типы', 'Базовые', 'Аналитика', 'Финансы', 'Сравнения']
    ), []);
    const [activeTab, setActiveTab] = useState('Все типы');

    const handleSelectType = (type) => {
        setSelectedType(type);
    };

    const handleConfirm = () => {
        if (selectedType) {
            onSelectSlideType(selectedType.id);
            onClose();
            setSelectedType(null);
        }
    };

    const handleClose = () => {
        onClose();
        setSelectedType(null);
    };

    if (!isOpen) return null;

    return (
        <div className="modal active" onClick={handleClose}>
            <div className="modal-content modal-xl" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h5 className="modal-title">Выберите тип слайда</h5>
                    <button 
                        className="modal-close" 
                        onClick={handleClose}
                        title="Закрыть"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="slide-types-container">
                        {/* Вкладки */}
                        <div className="type-tabs">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Список типов без иконок, как в макете */}
                        <div className="slide-types-grid">
                            {slideTypes
                                .filter(t => activeTab === 'Все типы' ||
                                    (activeTab === 'Базовые' && t.category === 'Основные') ||
                                    (activeTab === 'Аналитика' && (t.category === 'Аналитика' || t.id === 'trends' || t.id === 'analytics-chart' || t.id === 'analytics-table')) ||
                                    (activeTab === 'Финансы' && (t.category === 'Финансы' || t.id === 'finance-chart' || t.id === 'finance-table')) ||
                                    (activeTab === 'Сравнения' && (t.category === 'Сравнения' || t.id === 'comparison' || t.id === 'plan-vs-actual'))
                                )
                                .map(type => (
                                <div
                                    key={type.id}
                                    className={`slide-type-card ${selectedType?.id === type.id ? 'selected' : ''}`}
                                    onClick={() => handleSelectType(type)}
                                >
                                    <div className="slide-type-texts">
                                        <div className="slide-type-name">{type.name}</div>
                                        <div className="slide-type-description">{type.description}</div>
                                    </div>
                                    <div className="slide-type-chevron">›</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="modal-footer">
                    <button 
                        className="btn btn-secondary" 
                        onClick={handleClose}
                    >
                        Отмена
                    </button>
                    <button className="btn btn-primary" onClick={handleConfirm} disabled={!selectedType}>Создать слайд</button>
                </div>
            </div>
        </div>
    );
};

export default SlideTypeModal;

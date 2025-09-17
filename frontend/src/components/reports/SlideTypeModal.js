import React, { useState, useMemo } from 'react';
import Modal from '../modals/Modal';
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
            id: 'finance-chart',
            name: 'Финансовый график',
            description: 'График финансовых показателей',
            icon: '💰',
            category: 'Графики'
        },

        /*{
            id: 'finance-table',
            name: 'Финансовая таблица',
            description: 'Таблица финансовых данных',
            icon: '📊',
            category: 'Таблицы'
        },*/
        {
            id: 'comparison',
            name: 'График сравнения',
            description: 'Сравнительный анализ данных',
            icon: '⚖️',
            category: 'Анализ'
        },

        /*{
            id: 'comparison-table',
            name: 'Таблица сравнения',
            description: 'Сравнительная таблица с фильтрами аналитики',
            icon: '📊',
            category: 'Сравнения'
        },*/

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
        ['Все типы', 'Базовые', 'Аналитика', 'Финансы', 'Сравнения', 'Таблица сравнения']
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

    const modalFooter = (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
                className="btn btn-secondary" 
                onClick={handleClose}
            >
                Отмена
            </button>
            <button 
                className="btn btn-primary" 
                onClick={handleConfirm} 
                disabled={!selectedType}
            >
                Создать слайд
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Выберите тип слайда"
            size="xl"
            footer={modalFooter}
            closeOnBackdrop={true}
            closeOnEscape={true}
            preventBodyScroll={true}
        >
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
                            (activeTab === 'Аналитика' && (t.category === 'Аналитика' || t.id === 'trends' || t.id === 'analytics-table')) ||
                            (activeTab === 'Финансы' && (t.category === 'Финансы' || t.id === 'finance-chart' || t.id === 'finance-table')) ||
                            (activeTab === 'Сравнения' && (t.category === 'Сравнения' || t.id === 'comparison' || t.id === 'plan-vs-actual')) ||
                            (activeTab === 'Таблица сравнения' && t.id === 'comparison-table')
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
        </Modal>
    );
};

export default SlideTypeModal;

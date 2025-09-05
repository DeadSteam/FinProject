import React, { useState } from 'react';
import Modal from '../modals/Modal';
import './DataSourceSelector.css';

/**
 * Компонент для выбора источника данных и типа слайда.
 * Отображает доступные типы слайдов с описанием и позволяет выбрать нужный.
 */
const DataSourceSelector = ({ slideTypes, availableData, onSlideTypeSelect, onClose }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Категории слайдов для фильтрации
    const categories = [
        { id: 'all', name: 'Все типы' },
        { id: 'basic', name: 'Базовые' },
        { id: 'analytics', name: 'Аналитика' },
        { id: 'finance', name: 'Финансы' },
        { id: 'comparison', name: 'Сравнения' }
    ];

    // Группировка типов слайдов по категориям
    const slideTypesByCategory = {
        basic: ['title'],
        analytics: ['analytics-chart', 'analytics-table'],
        finance: ['finance-chart', 'finance-table'],
        comparison: ['comparison', 'trends', 'plan-vs-actual']
    };

    // Фильтрация типов слайдов
    const filteredSlideTypes = slideTypes.filter(slideType => {
        if (selectedCategory === 'all') return true;
        return slideTypesByCategory[selectedCategory]?.includes(slideType.id);
    });

    const handleSlideTypeClick = (slideType) => {
        onSlideTypeSelect(slideType);
        onClose();
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Выберите тип слайда"
            size="lg"
        >
            <div className="data-source-selector">
                {/* Категории */}
                <div className="categories-nav mb-4">
                    <div className="d-flex flex-wrap gap-2">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                className={`btn btn-sm ${selectedCategory === category.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setSelectedCategory(category.id)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Сетка типов слайдов */}
                <div className="slide-types-grid">
                    {filteredSlideTypes.map(slideType => (
                        <div
                            key={slideType.id}
                            className="slide-type-card"
                            onClick={() => handleSlideTypeClick(slideType)}
                        >
                            <div className="slide-type-info">
                                <h6 className="slide-type-name">{slideType.name}</h6>
                                <p className="slide-type-description">{slideType.description}</p>
                            </div>
                            <div className="slide-type-arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="9,18 15,12 9,6"/>
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredSlideTypes.length === 0 && (
                    <div className="text-center text-muted p-4">
                        <p>Нет доступных типов слайдов в выбранной категории</p>
                    </div>
                )}

                {/* Информация о доступных данных */}
                <div className="available-data-info mt-4">
                    <h6 className="mb-3">Доступные данные</h6>
                    <div className="row text-center">
                        <div className="col-3">
                            <div className="data-info-item">
                                <strong className="text-primary d-block">{availableData.years?.length || 0}</strong>
                                <small className="text-muted">Годы</small>
                            </div>
                        </div>
                        <div className="col-3">
                            <div className="data-info-item">
                                <strong className="text-success d-block">{availableData.categories?.length || 0}</strong>
                                <small className="text-muted">Категории</small>
                            </div>
                        </div>
                        <div className="col-3">
                            <div className="data-info-item">
                                <strong className="text-warning d-block">{availableData.shops?.length || 0}</strong>
                                <small className="text-muted">Магазины</small>
                            </div>
                        </div>
                        <div className="col-3">
                            <div className="data-info-item">
                                <strong className="text-info d-block">{availableData.metrics?.length || 0}</strong>
                                <small className="text-muted">Метрики</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default DataSourceSelector;

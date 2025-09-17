import React from 'react';
import './SlideSettings.css';
import '../../styles/components/ButtonGroup.css';

/**
 * Компонент для настроек слайда
 */
const SlideSettings = ({ 
    slideType, 
    title, 
    description,
    settings = {}, 
    filters = {}, 
    availableData = {},
    onTitleChange, 
    onDescriptionChange, 
    onSettingsChange, 
    onFiltersChange 
}) => {
    const renderSlideTypeSettings = () => {
        switch (slideType) {
            case 'title':
                return (
                    <div className="mb-3">
                        <label className="form-label">Описание</label>
                        <textarea
                            className="form-control"
                            rows="3"
                            value={description || ''}
                            onChange={(e) => onDescriptionChange(e.target.value)}
                            placeholder="Введите описание для титульного слайда"
                        />
                    </div>
                );

            case 'analytics-chart':
            case 'trends':
                return (
                    <div className="setting-group">
                        <div className="setting-row">
                            <div className="setting-column">
                                <label className="form-label">Тип графика</label>
                                <div className="chart-type-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(settings?.chartType || 'line') === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onSettingsChange({ chartType: 'line' })}
                                        >
                                            Линейный
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${ (settings?.chartType || 'line') === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onSettingsChange({ chartType: 'bar' })}
                                        >
                                            Столбчатый
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="setting-column">
                                <label className="form-label">Период отображения</label>
                                <div className="period-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(filters?.periodType || 'year') === 'year' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'year'
                                            })}
                                        >
                                            Год
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.periodType === 'quarters' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'quarters'
                                            })}
                                        >
                                            Кварталы
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.periodType === 'months' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'months'
                                            })}
                                        >
                                            Месяцы
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Дополнительные настройки трендов */}
                        <div className="setting-row mt-3">
                            <div className="setting-column">
                                <label className="form-label">Опции трендов</label>
                                <div className="metrics-toggles">
                                    <div className="toggle-item">
                                        <span className="toggle-text">Сглаживание</span>
                                        <label className={`toggle-switch ${filters?.smoothing === true ? 'active' : ''}`}>
                                            <input
                                                className="toggle-input"
                                                type="checkbox"
                                                checked={filters?.smoothing === true}
                                                onChange={(e) => onFiltersChange({
                                                    ...filters,
                                                    smoothing: e.target.checked
                                                })}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="toggle-item">
                                        <span className="toggle-text">Показать прогноз</span>
                                        <label className={`toggle-switch ${filters?.showForecast === true ? 'active' : ''}`}>
                                            <input
                                                className="toggle-input"
                                                type="checkbox"
                                                checked={filters?.showForecast === true}
                                                onChange={(e) => onFiltersChange({
                                                    ...filters,
                                                    showForecast: e.target.checked
                                                })}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'plan-vs-actual':
                return (
                    <div className="setting-group">
                        <div className="setting-row">
                            <div className="setting-column">
                                <label className="form-label">Тип графика</label>
                                <div className="chart-type-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(settings?.chartType || 'bar') === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onSettingsChange({ chartType: 'bar' })}
                                        >
                                            Столбчатый
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${ (settings?.chartType || 'bar') === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onSettingsChange({ chartType: 'line' })}
                                        >
                                            Линейный
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="setting-column">
                                <label className="form-label">Группировка</label>
                                <div className="period-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${ (filters?.groupBy || 'categories') === 'categories' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                groupBy: 'categories'
                                            })}
                                        >
                                            Категории
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${ (filters?.groupBy) === 'subcategories' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                groupBy: 'subcategories'
                                            })}
                                        >
                                            Подкатегории
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${ (filters?.groupBy) === 'shops' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                groupBy: 'shops'
                                            })}
                                        >
                                            Магазины
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="setting-column">
                                <label className="form-label">Отображение</label>
                                <div className="period-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(filters?.viewMode || 'chart') === 'chart' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                viewMode: 'chart'
                                            })}
                                        >
                                            График
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                viewMode: 'table'
                                            })}
                                        >
                                            Таблица
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.viewMode === 'both' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                viewMode: 'both'
                                            })}
                                        >
                                            Оба
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'finance-chart':
                return (
                    <div className="setting-group">
                        <div className="setting-row">
                            <div className="setting-column">
                                <label className="form-label">Тип графика</label>
                                <div className="chart-type-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(settings?.chartType || 'bar') === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onSettingsChange({ chartType: 'bar' })}
                                        >
                                            Столбчатый
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${(settings?.chartType || 'bar') === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onSettingsChange({ chartType: 'line' })}
                                        >
                                            Линейный
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="setting-column">
                                <label className="form-label">Период отображения</label>
                                <div className="period-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(filters?.periodType || 'quarters') === 'quarters' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'quarters'
                                            })}
                                        >
                                            Кварталы
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.periodType === 'months' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'months'
                                            })}
                                        >
                                            Месяцы
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'finance-table':
            case 'analytics-table':
                return (
                    <div className="setting-group">
                        <div className="setting-row">
                            <div className="setting-column">
                                <label className="form-label">Показывать кварталы</label>
                                <div className="metrics-toggles">
                                    <div className="toggle-item">
                                        <span className="toggle-text">Включить строки кварталов</span>
                                        <label className={`toggle-switch ${settings?.showQuarters !== false ? 'active' : ''}`}>
                                            <input
                                                className="toggle-input"
                                                type="checkbox"
                                                checked={settings?.showQuarters !== false}
                                                onChange={(e) => onSettingsChange({ showQuarters: e.target.checked })}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'comparison':
                return (
                    <div className="setting-group">
                        <div className="setting-row">
                            <div className="setting-column">
                                <label className="form-label">Тип графика</label>
                                <div className="chart-type-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(filters?.chartType || 'bar') === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                chartType: 'bar'
                                            })}
                                        >
                                            Столбчатый
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${(filters?.chartType || 'bar') === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                chartType: 'line'
                                            })}
                                        >
                                            Линейный
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="setting-column">
                                <label className="form-label">Период отображения</label>
                                <div className="period-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(filters?.periodType || 'year') === 'year' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'year'
                                            })}
                                        >
                                            Год
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.periodType === 'quarters' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'quarters'
                                            })}
                                        >
                                            Кварталы
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.periodType === 'months' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'months'
                                            })}
                                        >
                                            Месяцы
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'comparison-table':
                return (
                    <div className="setting-group">
                        <div className="setting-row">
                            <div className="setting-column">
                                <label className="form-label">Период отображения</label>
                                <div className="period-selector">
                                    <div className="btn-group button-group-container" role="group">
                                        <button 
                                            type="button"
                                            className={`btn ${(filters?.periodType || 'year') === 'year' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'year'
                                            })}
                                        >
                                            Год
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.periodType === 'quarters' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'quarters'
                                            })}
                                        >
                                            Кварталы
                                        </button>
                                        <button 
                                            type="button"
                                            className={`btn ${filters?.periodType === 'months' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => onFiltersChange({
                                                ...filters,
                                                periodType: 'months'
                                            })}
                                        >
                                            Месяцы
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        Настройки для данного типа слайда пока не реализованы
                    </div>
                );
        }
    };

    return (
        <div className="slide-settings">
            {/* Объединенные настройки */}
            <div className="card mb-3">
                <div className="card-header">
                    <h6 className="mb-0">Настройки слайда</h6>
                </div>
                <div className="card-body">
                    <div className="setting-group">
                        <label className="form-label">Заголовок слайда</label>
                        <input
                            type="text"
                            className="form-control"
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder="Введите заголовок слайда"
                        />
                    </div>

                    {/* Настройки для типа слайда */}
                    {renderSlideTypeSettings()}
                </div>
            </div>
        </div>
    );
};

export default SlideSettings;

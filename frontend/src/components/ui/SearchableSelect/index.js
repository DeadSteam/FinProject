import PropTypes from 'prop-types';
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

import Input from '../Input';
import './SearchableSelect.module.css';

/**
 * SearchableSelect - составной компонент с поиском и фильтрацией
 * Использует существующие стили и компоненты
 */
const SearchableSelect = ({
    options = [],
    value = null,
    onChange,
    placeholder = 'Выберите опцию...',
    searchPlaceholder = 'Поиск...',
    label = '',
    error = '',
    disabled = false,
    required = false,
    multiple = false,
    size = 'md',
    clearable = false,
    loading = false,
    noOptionsText = 'Ничего не найдено',
    valueKey = 'value',
    labelKey = 'label',
    groupKey = null,
    searchKeys = null,
    renderOption = null,
    className = '',
    ...props
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 200 });
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Фильтрация опций
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        
        const searchKeys_ = searchKeys || [labelKey];
        
        return options.filter(option => {
            return searchKeys_.some(key => {
                const searchValue = option[key]?.toString().toLowerCase() || '';
                return searchValue.includes(searchTerm.toLowerCase());
            });
        });
    }, [options, searchTerm, searchKeys, labelKey]);

    // Группировка опций
    const groupedOptions = useMemo(() => {
        if (!groupKey) return { ungrouped: filteredOptions };
        
        return filteredOptions.reduce((groups, option) => {
            const group = option[groupKey] || 'Без группы';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(option);
            return groups;
        }, {});
    }, [filteredOptions, groupKey]);

    // Получить выбранные опции
    const selectedOptions = useMemo(() => {
        if (!value || !options.length) return [];
        
        if (multiple) {
            if (!Array.isArray(value)) return [];
            
            return options.filter(opt => {
                // Приводим к строке для сравнения, так как value может содержать строки или числа
                const optValue = String(opt[valueKey]);
                return value.some(val => String(val) === optValue);
            });
        } else {
            const stringValue = String(value);
            return options.filter(opt => String(opt[valueKey]) === stringValue);
        }
    }, [value, options, multiple, valueKey]);

    // Отображение выбранного значения
    const displayValue = useMemo(() => {
        if (!selectedOptions.length) return '';
        
        if (multiple) {
            return selectedOptions.map(opt => opt[labelKey]).join(', ');
        } else {
            return selectedOptions[0][labelKey];
        }
    }, [selectedOptions, multiple, labelKey]);

    // Обновление позиции dropdown - точное позиционирование как в react-select
    const updateDropdownPosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    // Закрытие dropdown при клике вне + обновление позиции при скролле
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                // Проверяем не кликнули ли в dropdown (который теперь в портале)
                const dropdown = document.querySelector('.searchable-select-dropdown');
                if (!dropdown || !dropdown.contains(event.target)) {
                    setIsOpen(false);
                    setSearchTerm('');
                    setHighlightedIndex(-1);
                }
            }
        };

        const handleScroll = () => {
            if (isOpen) {
                updateDropdownPosition();
            }
        };

        const handleResize = () => {
            if (isOpen) {
                updateDropdownPosition();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true); // true для capture фазы
            window.addEventListener('resize', handleResize);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [isOpen]);

    // Используем useLayoutEffect для точного позиционирования без flicker
    useLayoutEffect(() => {
        if (isOpen) {
            updateDropdownPosition();
        }
    }, [isOpen]);

    // Обработка клавиш
    const handleKeyDown = (event) => {
        if (disabled) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev => 
                        prev < filteredOptions.length - 1 ? prev + 1 : 0
                    );
                }
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev => 
                        prev > 0 ? prev - 1 : filteredOptions.length - 1
                    );
                }
                break;
                
            case 'Enter':
                event.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    handleSelect(filteredOptions[highlightedIndex]);
                } else {
                    setIsOpen(!isOpen);
                }
                break;
                
            case 'Escape':
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
                
            default:
                if (!isOpen) {
                    setIsOpen(true);
                }
        }
    };

    const handleSelect = (option) => {
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const optionValue = option[valueKey];
            
            // Проверяем, есть ли уже эта опция в выбранных (с учетом типов данных)
            const isAlreadySelected = currentValues.some(val => String(val) === String(optionValue));
            
            const newValues = isAlreadySelected
                ? currentValues.filter(v => String(v) !== String(optionValue))
                : [...currentValues, optionValue];
            
            onChange?.(newValues);
        } else {
            onChange?.(option[valueKey]);
            setIsOpen(false);
            setSearchTerm('');
        }
        
        setHighlightedIndex(-1);
    };

    const handleClear = () => {
        onChange?.(multiple ? [] : null);
    };

    const getSelectClasses = () => {
        const classes = ['searchable-select'];
        
        if (size === 'sm') classes.push('searchable-select-sm');
        if (size === 'lg') classes.push('searchable-select-lg');
        if (isOpen) classes.push('searchable-select-open');
        if (disabled) classes.push('searchable-select-disabled');
        if (error) classes.push('searchable-select-error');
        if (className) classes.push(className);
        
        return classes.join(' ');
    };

    const renderOptionContent = (option, index) => {
        if (renderOption) {
            return renderOption(option, index);
        }
        
        return (
            <div className="searchable-select-option-content">
                <span className="searchable-select-option-label">
                    {option[labelKey]}
                </span>
                {option.description && (
                    <span className="searchable-select-option-description">
                        {option.description}
                    </span>
                )}
            </div>
        );
    };

    const renderOptions = () => {
        if (loading) {
            return (
                <div className="searchable-select-loading">
                    <div className="loading-spinner">
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle 
                                cx="12" 
                                cy="12" 
                                r="10" 
                                stroke="currentColor" 
                                strokeWidth="4" 
                                strokeDasharray="32" 
                                strokeDashoffset="32"
                            >
                                <animate 
                                    attributeName="stroke-dashoffset" 
                                    dur="1s" 
                                    values="32;0;32" 
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </svg>
                    </div>
                    <span>Загрузка...</span>
                </div>
            );
        }

        if (filteredOptions.length === 0) {
            return (
                <div className="searchable-select-no-options">
                    {noOptionsText}
                </div>
            );
        }

        if (groupKey) {
            return Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <div key={groupName} className="searchable-select-group">
                    <div className="searchable-select-group-label">
                        {groupName}
                    </div>
                    {groupOptions.map((option, index) => {
                        const globalIndex = filteredOptions.indexOf(option);
                        const isSelected = multiple 
                            ? (Array.isArray(value) && value.some(val => String(val) === String(option[valueKey])))
                            : String(value) === String(option[valueKey]);
                        const isHighlighted = globalIndex === highlightedIndex;
                        
                        return (
                            <div
                                key={option[valueKey]}
                                className={`searchable-select-option ${
                                    isSelected ? 'selected' : ''
                                } ${isHighlighted ? 'highlighted' : ''}`}
                                onClick={() => handleSelect(option)}
                                onMouseEnter={() => setHighlightedIndex(globalIndex)}
                            >
                                {multiple && (
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="searchable-select-checkbox"
                                    />
                                )}
                                {renderOptionContent(option, index)}
                            </div>
                        );
                    })}
                </div>
            ));
        } else {
            return filteredOptions.map((option, index) => {
                const isSelected = multiple 
                    ? (Array.isArray(value) && value.some(val => String(val) === String(option[valueKey])))
                    : String(value) === String(option[valueKey]);
                const isHighlighted = index === highlightedIndex;
                
                return (
                    <div
                        key={option[valueKey]}
                        className={`searchable-select-option ${
                            isSelected ? 'selected' : ''
                        } ${isHighlighted ? 'highlighted' : ''}`}
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                    >
                        {multiple && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="searchable-select-checkbox"
                            />
                        )}
                        {renderOptionContent(option, index)}
                    </div>
                );
            });
        }
    };



    return (
        <div ref={containerRef} className={getSelectClasses()}>
            <div className="searchable-select-input-wrapper">
                <Input
                    ref={inputRef}
                    label={label}
                    value={isOpen ? searchTerm : displayValue}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={() => {
                        if (!disabled) {
                            if (!isOpen) {
                                updateDropdownPosition();
                            }
                            setIsOpen(!isOpen);
                        }
                    }}
                    placeholder={isOpen ? searchPlaceholder : placeholder}
                    disabled={disabled}
                    error={error}
                    required={required}
                    size={size}
                    readOnly={!isOpen}
                    icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="6,9 12,15 18,9"></polyline>
                        </svg>
                    }
                />
                {clearable && selectedOptions.length > 0 && (
                    <button
                        type="button"
                        className="searchable-select-clear-btn"
                        onClick={handleClear}
                        title="Очистить выбор"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                )}
            </div>
            
            {isOpen && createPortal(
                <div 
                    className="searchable-select-dropdown"
                    style={{
                        position: 'absolute',
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        zIndex: 9999
                    }}
                >
                    <div className="searchable-select-options">
                        {renderOptions()}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

SearchableSelect.propTypes = {
    options: PropTypes.array,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.array
    ]),
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    searchPlaceholder: PropTypes.string,
    label: PropTypes.string,
    error: PropTypes.string,
    disabled: PropTypes.bool,
    required: PropTypes.bool,
    multiple: PropTypes.bool,
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    clearable: PropTypes.bool,
    loading: PropTypes.bool,
    noOptionsText: PropTypes.string,
    valueKey: PropTypes.string,
    labelKey: PropTypes.string,
    groupKey: PropTypes.string,
    searchKeys: PropTypes.array,
    renderOption: PropTypes.func,
    className: PropTypes.string
};

export default SearchableSelect; 
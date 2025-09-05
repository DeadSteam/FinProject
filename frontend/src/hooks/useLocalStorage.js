import { useState, useEffect, useCallback } from 'react';

/**
 * Хук для работы с localStorage с синхронизацией состояния
 * @param {string} key - Ключ в localStorage
 * @param {*} initialValue - Начальное значение
 * @returns {Array} - [value, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue) {
    // Получаем значение из localStorage или используем начальное
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    // Функция для установки значения
    const setValue = useCallback((value) => {
        try {
            setStoredValue(prevValue => {
                // Позволяем передавать функцию как в useState
                const valueToStore = value instanceof Function ? value(prevValue) : value;
                
                // Сохраняем в localStorage
                if (valueToStore === undefined) {
                    window.localStorage.removeItem(key);
                } else {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
                
                return valueToStore;
            });
        } catch (error) {
            // Ошибка при обновлении из localStorage
        }
    }, [key]);

    // Функция для удаления значения
    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            window.localStorage.removeItem(key);
        } catch (error) {
            // Ошибка при удалении из localStorage
        }
    }, [key, initialValue]);

    // Слушаем изменения в localStorage (для синхронизации между вкладками)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    // Ошибка при обновлении из localStorage
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);

    return [storedValue, setValue, removeValue];
}

/**
 * Хук для работы с sessionStorage
 * @param {string} key - Ключ в sessionStorage
 * @param {*} initialValue - Начальное значение
 * @returns {Array} - [value, setValue, removeValue]
 */
export function useSessionStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            setStoredValue(prevValue => {
                const valueToStore = value instanceof Function ? value(prevValue) : value;
                
                if (valueToStore === undefined) {
                    window.sessionStorage.removeItem(key);
                } else {
                    window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
                }
                
                return valueToStore;
            });
        } catch (error) {
            // Ошибка при удалении из sessionStorage
        }
    }, [key]);

    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            window.sessionStorage.removeItem(key);
        } catch (error) {
            // Ошибка при удалении из sessionStorage
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
} 
 
 
 
 
 
 
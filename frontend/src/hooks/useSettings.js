import { useCallback } from 'react';

import { useApp } from '../context/AppContext';

import { useLocalStorage } from './useLocalStorage.js';

/**
 * Хук для управления пользовательскими настройками
 * Инкапсулирует логику сохранения, применения и уведомлений о настройках
 */
export const useSettings = () => {
    const { showToast } = useApp();
    
    // Используем localStorage для хранения настроек
    const [settings, setSettings] = useLocalStorage('userSettings', {
        emailNotifications: true,
        darkTheme: false,
        twoFactorAuth: false
    });

    // Названия настроек для уведомлений
    const settingTitles = {
        emailNotifications: 'Уведомления по email',
        darkTheme: 'Темная тема',
        twoFactorAuth: 'Двухфакторная аутентификация'
    };

    // Обработчик изменения настройки
    const changeSetting = useCallback((settingName, value) => {
        setSettings(prevSettings => {
            const newSettings = {
                ...prevSettings,
                [settingName]: value
            };
            return newSettings;
        });
        
        // Показываем уведомление
        const settingTitle = settingTitles[settingName];
        showToast(`Настройка "${settingTitle}" ${value ? 'включена' : 'отключена'}`, 'success');
        
        // Применяем специальную логику для темной темы
        if (settingName === 'darkTheme') {
            document.body.classList.toggle('dark-theme', value);
        }
    }, [setSettings, showToast]);

    // Применение настроек при инициализации
    const applySettings = useCallback(() => {
        // Применяем темную тему если она включена
        document.body.classList.toggle('dark-theme', settings.darkTheme);
    }, [settings.darkTheme]);

    return {
        settings,
        changeSetting,
        applySettings,
        // Экспортируем отдельные настройки для удобства
        emailNotifications: settings.emailNotifications,
        darkTheme: settings.darkTheme,
        twoFactorAuth: settings.twoFactorAuth
    };
};
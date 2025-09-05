import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button.js';
import { useAuthSession, useAuthStatus, useAuthError, useAuthErrorManagement } from '../context/auth';
import { useForm, useAsyncOperation, useNotifications, useErrorBoundary } from '../hooks';
import styles from '../styles/pages/Login.module.css';
import { formatPhoneNumber } from '../utils/formatUtils.js';
import { isValidEmail, isValidPhoneNumber } from '../utils/validationUtils.js';

/**
 * Страница авторизации - точная копия client/pages/login.html
 */
function Login() {
    const navigate = useNavigate();
    const { login } = useAuthSession();
    const { isAuthenticated, isLoading } = useAuthStatus();
    const error = useAuthError();
    const { clearError } = useAuthErrorManagement();
    
    // Новые хуки для улучшенного UX
    const { showSuccess, showError, showInfo } = useNotifications();
    const { ErrorBoundary, resetError } = useErrorBoundary();
    
    // Используем useForm для управления формой
    const loginForm = useForm(
        {
            identifier: '',
            password: '',
            remember: false
        },
        {
            identifier: (value) => {
                if (!value.trim()) return 'Введите email или номер телефона';
                if (!value.includes('@') && !isValidPhoneNumber(value)) {
                    return 'Введите корректный email или номер телефона';
                }
                if (value.includes('@') && !isValidEmail(value)) {
                    return 'Введите корректный email';
                }
                return null;
            },
            password: (value) => !value ? 'Введите пароль' : null
        }
    );
    
    const [showPassword, setShowPassword] = useState(false);

    // Асинхронная операция для входа в систему
    const loginOperation = useAsyncOperation(
        async () => {
            // Валидация формы
            if (!loginForm.validate()) {
                throw new Error('Пожалуйста, исправьте ошибки в форме');
            }

            showInfo('Вход в систему', 'Проверяем ваши данные...');
            
            await login(loginForm.values.identifier, loginForm.values.password);
            
            showSuccess('Добро пожаловать!', 'Вы успешно вошли в систему');
        },
        {
            onError: (loginError) => {
                // Ошибка может быть установлена в AuthContext или возникнуть локально
                const errorMessage = loginError.message || error || 'Ошибка при входе в систему';
                showError('Ошибка входа', errorMessage);
                if (process.env.NODE_ENV === 'development') {
                    console.error('Login error:', loginError);
                }
            }
        }
    );

    // Перенаправление если уже авторизован
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Очистка ошибок при размонтировании или изменении состояния
    useEffect(() => {
        return () => {
            if (error) {
                clearError();
            }
        };
    }, [error, clearError]);

    // Обработчик изменения полей формы
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        loginForm.handleChange(name, newValue);

        // Очищаем глобальную ошибку авторизации
        if (error) {
            clearError();
        }
    };

    // Обработчик потери фокуса для форматирования телефона
    const handleIdentifierBlur = () => {
        if (loginForm.values.identifier && !loginForm.values.identifier.includes('@')) {
            const formatted = formatPhoneNumber(loginForm.values.identifier);
            loginForm.handleChange('identifier', formatted);
        }
    };

    // Переключение видимости пароля
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Обработчик отправки формы
    const handleSubmit = async (e) => {
        e.preventDefault();
        await loginOperation.execute();
    };

    // Рендер плавающих частиц
    const renderFloatingParticles = () => (
        <div className={styles.loginBackdrop}>
            {[...Array(6)].map((_, index) => (
                <div key={index} className={styles.floatingParticle}></div>
            ))}
        </div>
    );

    return (
        <ErrorBoundary>
            <div className={styles.loginPage}>
            {renderFloatingParticles()}
            <div className={styles.particlesOverlay}></div>
            
            <div className={styles.loginContainer}>
                {/* Логотип */}
                <div className={styles.loginLogo}>
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7zm0 4a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7z"/>
                    </svg>
                    <div className={styles.logoText}>PriFin</div>
                </div>
                
                {/* Заголовок */}
                <div className={styles.loginHeader}>
                    <h1>Добро пожаловать</h1>
                    <p>Войдите в свой аккаунт для доступа к аналитике</p>
                </div>
                
                {/* Форма входа */}
                <form onSubmit={handleSubmit} className={styles.animateForm}>
                    {/* Общая ошибка */}
                    {(loginForm.errors.general || error) && (
                        <div className={styles.errorMessage}>
                            {loginForm.errors.general || error}
                        </div>
                    )}
                    
                    {/* Поле идентификатора */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="identifier">Email / Телефон</label>
                        <div className={styles.inputWrapper}>
                            <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                                                            <input
                                    type="text"
                                    id="identifier"
                                    name="identifier"
                                    value={loginForm.values.identifier}
                                    onChange={handleInputChange}
                                    onBlur={handleIdentifierBlur}
                                    placeholder="Введите email или номер телефона"
                                    required
                                    className={styles.input}
                                    disabled={loginOperation.loading || isLoading}
                                />
                        </div>
                        {loginForm.errors.identifier && (
                            <div className={styles.errorMessage}>{loginForm.errors.identifier}</div>
                        )}
                    </div>
                    
                    {/* Поле пароля */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Пароль</label>
                        <div className={styles.inputWrapper}>
                            <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                                                            <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={loginForm.values.password}
                                    onChange={handleInputChange}
                                    placeholder="Введите ваш пароль"
                                    required
                                    className={styles.input}
                                    disabled={loginOperation.loading || isLoading}
                                />
                                                            <button 
                                    type="button" 
                                    className={`${styles.passwordToggle} ${showPassword ? styles.active : ''}`}
                                    onClick={togglePasswordVisibility}
                                    disabled={loginOperation.loading || isLoading}
                                >
                                <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                        {loginForm.errors.password && (
                            <div className={styles.errorMessage}>{loginForm.errors.password}</div>
                        )}
                    </div>
                    
                    {/* Опции входа */}
                    <div className={styles.loginOptions}>
                        <div className={styles.rememberMe}>
                            <label className={styles.customCheckbox}>
                                                                    <input 
                                        type="checkbox" 
                                        id="remember" 
                                        name="remember"
                                        checked={loginForm.values.remember}
                                        onChange={handleInputChange}
                                        disabled={loginOperation.loading || isLoading}
                                    />
                                <span className={styles.checkboxIndicator}></span>
                                <span className={styles.checkboxLabel}>Запомнить меня</span>
                            </label>
                        </div>
                        <a href="#" className={styles.forgotPassword}>Забыли пароль?</a>
                    </div>
                    
                    {/* Кнопка входа */}
                                            <Button 
                            type="submit" 
                            className={styles.loginBtn}
                            loading={loginOperation.loading || isLoading}
                            disabled={loginOperation.loading || isLoading}
                            size="large"
                            variant="primary"
                        >
                            {loginOperation.loading ? 'Входим...' : 'Войти'}
                        </Button>
                    
                    {/* Футер */}
                    <div className={styles.loginFooter}>
                        <div className={styles.securityInfo}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <span>Защищено шифрованием</span>
                        </div>
                        <p>© 2025 <a href="#">PriFin</a></p>
                    </div>
                </form>
            </div>
        </div>
        </ErrorBoundary>
    );
}

export default Login; 
 
 
 
 
 
 
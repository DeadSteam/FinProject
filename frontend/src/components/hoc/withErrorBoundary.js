import React from 'react';

import { useErrorBoundary } from '../../hooks';

/**
 * HOC для обработки ошибок компонентов
 * Ответственность: отлов и обработка ошибок React компонентов
 * Соблюдает принципы SRP и OCP - легко расширяется кастомными обработчиками
 * 
 * @param {React.Component} WrappedComponent - оборачиваемый компонент
 * @param {object} options - настройки обработки ошибок
 * @returns {React.Component} компонент с обработкой ошибок
 */
const withErrorBoundary = (WrappedComponent, options = {}) => {
    const {
        fallbackComponent: FallbackComponent = DefaultErrorFallback,
        onError = null,
        enableRetry = true,
        enableReport = true,
        isolateErrors = true, // Изолировать ошибки от родительских компонентов
        retryLimit = 3,
        logErrors = true
    } = options;

    const WithErrorBoundaryComponent = (props) => {
        const {
            captureError,
            clearError,
            hasError,
            error,
            retryCount,
            retry,
            canRetry
        } = useErrorBoundary({
            onError,
            enableRetry,
            retryLimit,
            logErrors
        });

        // Если есть ошибка, показываем fallback
        if (hasError) {
            return (
                <FallbackComponent
                    error={error}
                    onRetry={enableRetry && canRetry ? retry : null}
                    onClear={clearError}
                    retryCount={retryCount}
                    canRetry={canRetry}
                    enableReport={enableReport}
                    {...props}
                />
            );
        }

        // Оборачиваем компонент в try-catch для runtime ошибок
        try {
            return <WrappedComponent {...props} />;
        } catch (err) {
            // Передаем ошибку в error boundary
            captureError(err);
            return (
                <FallbackComponent
                    error={err}
                    onRetry={enableRetry ? retry : null}
                    onClear={clearError}
                    retryCount={retryCount}
                    canRetry={canRetry}
                    enableReport={enableReport}
                    {...props}
                />
            );
        }
    };

    // Копируем displayName для удобства отладки
    WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

    // Копируем статические методы и свойства
    Object.keys(WrappedComponent).forEach(key => {
        if (key !== 'displayName' && key !== 'name') {
            WithErrorBoundaryComponent[key] = WrappedComponent[key];
        }
    });

    return WithErrorBoundaryComponent;
};

/**
 * Компонент по умолчанию для отображения ошибок
 */
const DefaultErrorFallback = ({ 
    error, 
    onRetry, 
    onClear, 
    retryCount, 
    canRetry, 
    enableReport = true 
}) => {
    const handleReport = () => {
        // Здесь можно добавить отправку отчета об ошибке
        console.error('Error reported:', error);
        
        // Интеграция с сервисом отчетов об ошибках (например, Sentry)
        if (window.Sentry) {
            window.Sentry.captureException(error);
        }
    };

    return (
        <div style={{
            padding: '2rem',
            margin: '1rem',
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '0.375rem',
            color: '#c53030'
        }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
                Произошла ошибка
            </h3>
            
            <details style={{ marginBottom: '1rem' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                    Подробности ошибки
                </summary>
                <pre style={{
                    backgroundColor: '#f7fafc',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    maxHeight: '200px'
                }}>
                    {error?.stack || error?.message || 'Неизвестная ошибка'}
                </pre>
            </details>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {onRetry && canRetry && (
                    <button
                        onClick={onRetry}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3182ce',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        Повторить попытку {retryCount > 0 && `(${retryCount})`}
                    </button>
                )}
                
                {onClear && (
                    <button
                        onClick={onClear}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#38a169',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        Очистить ошибку
                    </button>
                )}
                
                {enableReport && (
                    <button
                        onClick={handleReport}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ed8936',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        Сообщить об ошибке
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Предопределенные HOC для частых случаев
 */

// Простой error boundary без retry
export const withSimpleErrorBoundary = (WrappedComponent, options = {}) =>
    withErrorBoundary(WrappedComponent, {
        ...options,
        enableRetry: false
    });

// Error boundary с автоматическим логированием
export const withLoggingErrorBoundary = (WrappedComponent, options = {}) =>
    withErrorBoundary(WrappedComponent, {
        ...options,
        logErrors: true,
        onError: (error, errorInfo) => {
            console.group('Component Error Logged');
            console.error('Error:', error);
            console.error('Error Info:', errorInfo);
            console.groupEnd();
        }
    });

// Error boundary для критических компонентов
export const withCriticalErrorBoundary = (WrappedComponent, options = {}) =>
    withErrorBoundary(WrappedComponent, {
        ...options,
        retryLimit: 5,
        enableReport: true,
        onError: (error, errorInfo) => {
            // Критические ошибки отправляем сразу в monitoring
            if (window.Sentry) {
                window.Sentry.captureException(error, {
                    tags: { critical: true },
                    extra: errorInfo
                });
            }
        }
    });

/**
 * Утилита для создания кастомного error boundary
 */
export const createErrorBoundary = (customOptions) => (WrappedComponent, options = {}) =>
    withErrorBoundary(WrappedComponent, {
        ...customOptions,
        ...options
    });

export default withErrorBoundary; 
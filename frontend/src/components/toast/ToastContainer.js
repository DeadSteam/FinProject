import React from 'react';
import { useToast } from '../../context/ToastContext';
import Toast from './Toast';

/**
 * ToastContainer - компонент для отображения всех активных toast уведомлений
 * Автоматически группирует их по позициям и рендерит
 */
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts || !Array.isArray(toasts) || toasts.length === 0) return null;
  
  // Группируем тосты по их позициям для отображения
  const toastsByPosition = {};
  toasts.forEach(toast => {
    if (!toast || typeof toast !== 'object') return;
    
    const position = toast.position || 'top-right';
    if (!toastsByPosition[position]) {
      toastsByPosition[position] = [];
    }
    toastsByPosition[position].push(toast);
  });
  
  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div key={position} className={`toast-container toast-container-${position}`}>
          {positionToasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message || ''}
              type={toast.type || 'info'}
              duration={toast.duration || 5000}
              position={position}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      ))}
    </>
  );
};

export default ToastContainer; 
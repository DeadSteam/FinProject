import { createRoot } from 'react-dom/client';

import App from './App';

// Импортируем глобальные стили
import './styles/globals.css';
import './styles/components/AGCharts.css';

// Инициализируем исправление ResizeObserver
import { initResizeObserverFix } from './components/charts/utils/resizeObserverFix';

// Применяем исправление ResizeObserver
initResizeObserverFix();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App />); 
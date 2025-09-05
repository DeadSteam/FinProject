import { createRoot } from 'react-dom/client';

import App from './App';

// Импортируем глобальные стили
import './styles/globals.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App />); 
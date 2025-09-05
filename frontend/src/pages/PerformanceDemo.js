/**
 * Phase 10 Task 10.4: Performance Demo Page
 * 
 * Демонстрационная страница для showcasing performance optimizations
 * и мониторинга производительности
 */

import React, { useState, useEffect } from 'react';

import Button from '../components/ui/Button';
import { 
    PerformanceMonitor, 
    withPerformanceProfiler, 
    usePerformanceTimer,
    runPerformanceAudit,
    measureLCP,
    measureFID
} from '../utils/performance';

// Компонент с профилированием
const ProfiledButton = withPerformanceProfiler(Button, 'DemoButton');

/**
 * Демо компонент для тестирования React.memo оптимизации
 */
const HeavyComponent = React.memo(({ data, color }) => {
    const renderStart = performance.now();
    
    // Имитируем тяжелые вычисления
    const processedData = data.map(item => ({
        ...item,
        processed: item.value * Math.random(),
        timestamp: Date.now()
    }));
    
    const renderEnd = performance.now();
    
    return (
        <div style={{ 
            background: color, 
            padding: '10px', 
            margin: '5px',
            borderRadius: '5px' 
        }}>
            <h4>Heavy Component</h4>
            <p>Processed {processedData.length} items in {(renderEnd - renderStart).toFixed(2)}ms</p>
            <small>Last render: {new Date().toLocaleTimeString()}</small>
        </div>
    );
});

/**
 * Демонстрационная страница производительности
 */
const PerformanceDemo = () => {
    const [heavyData, setHeavyData] = useState([]);
    const [componentColor, setComponentColor] = useState('#e3f2fd');
    const [renderCount, setRenderCount] = useState(0);
    const [auditResults, setAuditResults] = useState(null);
    
    const timerDemo = usePerformanceTimer('Demo Operation');
    
    // Генерируем данные для тяжелого компонента
    useEffect(() => {
        const data = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            value: Math.random() * 100,
            name: `Item ${i}`
        }));
        setHeavyData(data);
    }, []);
    
    // Функция для триггера ре-рендера
    const triggerRerender = () => {
        setRenderCount(prev => prev + 1);
    };
    
    // Функция для изменения цвета (должна триггерить ре-рендер HeavyComponent)
    const changeColor = () => {
        const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0', '#fce4ec'];
        setComponentColor(colors[Math.floor(Math.random() * colors.length)]);
    };
    
    // Функция для демонстрации performance timer
    const runTimerDemo = async () => {
        const timer = timerDemo();
        
        // Имитируем асинхронную операцию
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        // Дополнительные вычисления
        const result = Array.from({ length: 10000 }, () => Math.random()).sort();
        
        timer.end();
        if (process.env.NODE_ENV === 'development') {
            console.log('Demo operation completed, result length:', result.length);
        }
    };
    
    // Функция для запуска полного аудита производительности
    const handlePerformanceAudit = async () => {
        try {
            const results = await runPerformanceAudit();
            setAuditResults(results);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Performance audit failed:', error);
            }
        }
    };
    
    // Функция для измерения Web Vitals
    const measureWebVitals = async () => {
        console.group('🎯 Web Vitals Measurement');
        
        try {
            const lcp = await measureLCP();
            if (process.env.NODE_ENV === 'development') {
                console.log('LCP Result:', lcp);
            }
            
            const fid = await measureFID();
            if (process.env.NODE_ENV === 'development') {
                console.log('FID Result:', fid);
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Web Vitals measurement failed:', error);
            }
        }
        
        console.groupEnd();
    };
    
    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>🚀 Phase 10: Performance Demo</h1>
            <p>Демонстрация оптимизаций производительности и мониторинга</p>
            
            {/* Performance Monitor - показывается только в development */}
            <PerformanceMonitor />
            
            {/* Control Panel */}
            <div style={{ 
                background: '#f5f5f5', 
                padding: '20px', 
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2>Control Panel</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <ProfiledButton 
                        variant="primary"
                        onClick={triggerRerender}
                    >
                        Trigger Re-render ({renderCount})
                    </ProfiledButton>
                    
                    <ProfiledButton 
                        variant="secondary"
                        onClick={changeColor}
                    >
                        Change Color (Re-render Heavy Component)
                    </ProfiledButton>
                    
                    <ProfiledButton 
                        variant="info"
                        onClick={runTimerDemo}
                    >
                        Run Timer Demo
                    </ProfiledButton>
                    
                    <ProfiledButton 
                        variant="success"
                        onClick={handlePerformanceAudit}
                    >
                        Run Performance Audit
                    </ProfiledButton>
                    
                    <ProfiledButton 
                        variant="warning"
                        onClick={measureWebVitals}
                    >
                        Measure Web Vitals
                    </ProfiledButton>
                </div>
            </div>
            
            {/* Heavy Component Demo */}
            <div style={{ 
                background: '#f9f9f9', 
                padding: '20px', 
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h2>React.memo Optimization Demo</h2>
                <p>
                    Компонент ниже обернут в React.memo. Он должен ре-рендериться только 
                    при изменении props (color или data), но не при изменении renderCount.
                </p>
                
                <HeavyComponent data={heavyData} color={componentColor} />
                
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    <div>Render count: {renderCount}</div>
                    <div>Current color: {componentColor}</div>
                    <div>Data items: {heavyData.length}</div>
                </div>
            </div>
            
            {/* Performance Audit Results */}
            {auditResults && (
                <div style={{ 
                    background: '#e8f5e8', 
                    padding: '20px', 
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <h2>📊 Performance Audit Results</h2>
                    <pre style={{ 
                        background: 'white', 
                        padding: '10px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '12px'
                    }}>
                        {JSON.stringify(auditResults, null, 2)}
                    </pre>
                </div>
            )}
            
            {/* Instructions */}
            <div style={{ 
                background: '#fff3cd', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #ffeaa7'
            }}>
                <h2>📝 Instructions</h2>
                <ul>
                    <li><strong>Trigger Re-render:</strong> Увеличивает счетчик, но HeavyComponent не должен ре-рендериться (благодаря React.memo)</li>
                    <li><strong>Change Color:</strong> Изменяет цвет, что должно вызвать ре-рендер HeavyComponent</li>
                    <li><strong>Run Timer Demo:</strong> Демонстрирует измерение времени выполнения операций</li>
                    <li><strong>Performance Audit:</strong> Запускает полный аудит производительности</li>
                    <li><strong>Web Vitals:</strong> Измеряет LCP и FID метрики</li>
                    <li><strong>Performance Monitor:</strong> Показывает real-time метрики в правом нижнем углу (только в development)</li>
                </ul>
                
                <h3>Что проверить в Console:</h3>
                <ul>
                    <li>Render tracking для ProfiledButton</li>
                    <li>Timer measurements</li>
                    <li>Performance audit results</li>
                    <li>Web Vitals measurements</li>
                </ul>
            </div>
        </div>
    );
};

export default PerformanceDemo; 
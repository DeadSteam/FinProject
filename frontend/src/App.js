import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';

import PrivateRoute from './components/common/PrivateRoute';
import AdminLayout from './components/layout/AdminLayout';
import Layout from './components/layout/Layout';
import { AppProvider } from './context/AppContext';
import { AppStateProvider } from './context/AppStateContext';
import { ServiceProvider } from './context/ServiceContext';
import { useAuthStatus, useAuthInitialization } from './context/auth';
import LoadingSpinner from './components/common/LoadingSpinner';
import './styles/globals.css';
import './components/toast/ToastStyles.css';
// Phase 4: Performance Optimization
// Lazy-load all pages except for Login and NotFound.
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const FinanceDetails = React.lazy(() => import('./pages/FinanceDetails'));
const Login = React.lazy(() => import('./pages/Login'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Reports = React.lazy(() => import('./pages/Reports'));

// Phase 10 Task 10.2: Lazy Loading для админских страниц
// Эти компоненты загружаются только при необходимости
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminShops = React.lazy(() => import('./pages/admin/AdminShops'));
const AdminCategories = React.lazy(() => import('./pages/admin/AdminCategories'));
const AdminMetrics = React.lazy(() => import('./pages/admin/AdminMetrics'));
const AdminYearlyPlans = React.lazy(() => import('./pages/admin/AdminYearlyPlans'));

// Компонент обертка для Suspense с красивым loading
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '60vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="loading-spinner" style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <div style={{ color: '#666', fontSize: '14px' }}>
        Загрузка модуля...
      </div>
    </div>
  }>
    {children}
  </Suspense>
);

// Компоненты

// Страницы

// Административные страницы

// 404 страница

// Компонент для публичных маршрутов (доступен только неавторизованным)
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStatus();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Если авторизован, перенаправляем на главную
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutesComponent() {
  const { isAuthenticated, isLoading, user } = useAuthStatus();
  const { initializeAuth } = useAuthInitialization();
  const initializeRef = React.useRef(false);
  const [forceShowContent, setForceShowContent] = React.useState(false);

  // Принудительное завершение загрузки через 5 секунд
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setForceShowContent(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Инициализация авторизации при монтировании (только один раз)
  React.useEffect(() => {
    if (!initializeRef.current) {
      initializeRef.current = true;
      // Выполняем инициализацию асинхронно с таймаутом
      const initWithTimeout = async () => {
        try {
          await Promise.race([
            initializeAuth(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
        } catch (error) {
          console.error('Инициализация auth завершена по таймауту или с ошибкой:', error);
          // Принудительно завершаем загрузку если есть проблемы
        }
      };
      initWithTimeout();
    }
  }, [initializeAuth]); // Убираем initializeAuth из dependencies

  // Показываем загрузку только если не форсируем показ контента
  if (isLoading && !forceShowContent) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        🔄 Инициализация приложения...
      </div>
    );
  }

  return (
    <Routes>
      {/* Публичные маршруты (только для неавторизованных) */}
      <Route path="/login" element={
        <PublicRoute>
          <SuspenseWrapper><Login /></SuspenseWrapper>
        </PublicRoute>
      } />
            
      {/* Защищенные маршруты */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <SuspenseWrapper><Dashboard /></SuspenseWrapper>
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/profile" element={
        <PrivateRoute>
          <Layout>
            <SuspenseWrapper><Profile /></SuspenseWrapper>
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/finance-details" element={
        <PrivateRoute>
          <Layout>
            <SuspenseWrapper><FinanceDetails /></SuspenseWrapper>
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/settings" element={
        <PrivateRoute>
          <Layout>
            <SuspenseWrapper><Settings /></SuspenseWrapper>
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/analytics" element={
        <PrivateRoute>
          <Layout>
            <SuspenseWrapper><Analytics /></SuspenseWrapper>
          </Layout>
        </PrivateRoute>
      } />
      
      <Route path="/reports" element={
        <PrivateRoute>
          <Layout>
            <SuspenseWrapper><Reports /></SuspenseWrapper>
          </Layout>
        </PrivateRoute>
      } />
      
      {/* Административные маршруты */}
      <Route path="/admin/*" element={
        <PrivateRoute requiredRole="admin">
          <AdminLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<SuspenseWrapper><AdminDashboard /></SuspenseWrapper>} />
        <Route path="users" element={<SuspenseWrapper><AdminUsers /></SuspenseWrapper>} />
        <Route path="shops" element={<SuspenseWrapper><AdminShops /></SuspenseWrapper>} />
        <Route path="categories" element={<SuspenseWrapper><AdminCategories /></SuspenseWrapper>} />
        <Route path="metrics" element={<SuspenseWrapper><AdminMetrics /></SuspenseWrapper>} />
        <Route path="yearly-plans" element={<SuspenseWrapper><AdminYearlyPlans /></SuspenseWrapper>} />
      </Route>
      
      {/* Все остальные маршруты */}
      <Route path="*" element={
        isAuthenticated ? <SuspenseWrapper><NotFound /></SuspenseWrapper> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppStateProvider>
          <ServiceProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutesComponent />
            </Router>
          </ServiceProvider>
        </AppStateProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;

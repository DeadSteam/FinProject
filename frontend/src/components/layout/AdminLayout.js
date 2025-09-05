import React, { useState, createContext } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { ToastContainer } from '../toast';
import styles from '../../styles/pages/Admin.module.css';

import Header from './Header';

// Контекст для управления sidebar
export const AdminContext = createContext();

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const menuItems = [
        {
            path: '/admin/dashboard',
            icon: (
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
            ),
            label: 'Дашборд'
        },
        {
            path: '/admin/users',
            icon: (
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
            ),
            label: 'Пользователи'
        },
        {
            path: '/admin/shops',
            icon: (
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
            ),
            label: 'Магазины'
        },
        {
            path: '/admin/categories',
            icon: (
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
            ),
            label: 'Категории'
        },
        {
            path: '/admin/metrics',
            icon: (
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
            ),
            label: 'Метрики'
        },

        {
            path: '/admin/yearly-plans',
            icon: (
                <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            ),
            label: 'Годовые планы'
        }
    ];

    return (
        <AdminContext.Provider value={{ toggleSidebar }}>
        <div className={styles.adminLayout}>
            {/* Добавляем Header */}
            <Header />
            
            {/* Боковое меню */}
            <nav className={`${styles.sidebar} ${sidebarOpen ? styles.active : ''}`}>
                <ul className={styles.navMenu}>
                    {menuItems.map((item) => (
                        <li key={item.path} className={styles.navItem}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `${styles.navLink} ${isActive ? styles.active : ''}`
                                }
                                onClick={() => setSidebarOpen(false)} // Закрываем sidebar при клике на ссылку
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Основной контент */}
            <main className={styles.mainContent}>
                <Outlet />
            </main>

            {/* Overlay для мобильного меню */}
            {sidebarOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Toast Container */}
            <ToastContainer />
        </div>
        </AdminContext.Provider>
    );
};

export default AdminLayout; 
 
 
 
 
 
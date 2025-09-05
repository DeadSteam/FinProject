import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuthUser, useAuthSession } from '../../context/auth';
import { usePermissions } from '../../hooks';

const Header = () => {
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const user = useAuthUser();
    const { logout } = useAuthSession();
    const { 
        isAdmin, 
        canAccessAdmin,
        hasRole 
    } = usePermissions();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        setIsUserDropdownOpen(false);
            setIsMobileMenuOpen(false);
            // Перенаправляем на страницу входа
            navigate('/login', { replace: true });
        } catch (error) {
            // Ошибка при выходе - не критично
        }
    };

    const toggleUserDropdown = () => {
        setIsUserDropdownOpen(!isUserDropdownOpen);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const getInitials = (name) => {
        if (!name) return 'АП';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    };

    const isActiveRoute = (path) => {
        return location.pathname === path;
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="header">
            <div className="header-logo">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7zm0 4a1 1 0 0 0 0 2h10a1 1 0 1 0 0-2H7z"/>
                </svg>
                PriFin
            </div>
            
            {/* Мобильное меню кнопка */}
            <button 
                className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
                onClick={toggleMobileMenu}
                aria-label="Открыть меню"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>
            
            {/* Десктопная навигация */}
            <nav className="header-nav">
                <Link 
                    to="/" 
                    className={isActiveRoute('/') ? 'active' : ''}
                >
                    Главная
                </Link>
                <Link 
                    to="/analytics" 
                    className={isActiveRoute('/analytics') ? 'active' : ''}
                >
                    Аналитика
                </Link>
                <Link 
                    to="/reports" 
                    className={isActiveRoute('/reports') ? 'active' : ''}
                >
                    Отчеты
                </Link>
                {canAccessAdmin && (
                    <Link 
                        to="/admin/dashboard" 
                        className={location.pathname.startsWith('/admin') ? 'active' : ''}
                    >
                        Админпанель
                    </Link>
                )}
            </nav>
            
            {/* Мобильная навигация */}
            <nav className={`mobile-nav ${isMobileMenuOpen ? 'active' : ''}`}>
                <div className="mobile-nav-content">
                    <div className="mobile-nav-header">
                        <div className="mobile-user-info">
                            <div className="mobile-user-avatar">
                                {getInitials(user?.name || user?.email)}
                            </div>
                            <div className="mobile-user-details">
                                <div className="mobile-user-name">
                                    {user?.name || user?.email || 'Загрузка...'}
                                </div>
                                <div className="mobile-user-role">
                                    {isAdmin ? 'Администратор' : 'Пользователь'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mobile-nav-links">
                        <Link 
                            to="/" 
                            className={`mobile-nav-link ${isActiveRoute('/') ? 'active' : ''}`}
                            onClick={closeMobileMenu}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9,22 9,12 15,12 15,22"/>
                            </svg>
                            Главная
                        </Link>
                        
                        <Link 
                            to="/analytics" 
                            className={`mobile-nav-link ${isActiveRoute('/analytics') ? 'active' : ''}`}
                            onClick={closeMobileMenu}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 3v18h18"/>
                                <path d="M18.7 8l-5.1 5.1-2.8-2.8L7 14.1"/>
                            </svg>
                            Аналитика
                        </Link>
                        
                        {canAccessAdmin && (
                            <Link 
                                to="/admin/dashboard" 
                                className={`mobile-nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                                onClick={closeMobileMenu}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <path d="M3 9h18M9 21V9"/>
                                </svg>
                                Админпанель
                            </Link>
                        )}
                        
                        <Link 
                            to="/profile" 
                            className={`mobile-nav-link ${isActiveRoute('/profile') ? 'active' : ''}`}
                            onClick={closeMobileMenu}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Профиль
                        </Link>
                        
                        <Link 
                            to="/reports" 
                            className={`mobile-nav-link ${isActiveRoute('/reports') ? 'active' : ''}`}
                            onClick={closeMobileMenu}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 17H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>
                                <path d="M9 12h6"/>
                                <path d="M9 9h6"/>
                                <path d="M9 15h6"/>
                            </svg>
                            Отчеты
                        </Link>
                        
                        <Link 
                            to="/settings" 
                            className={`mobile-nav-link ${isActiveRoute('/settings') ? 'active' : ''}`}
                            onClick={closeMobileMenu}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                            </svg>
                            Настройки
                        </Link>
                    </div>
                    
                    <div className="mobile-nav-footer">
                        <button 
                            className="mobile-logout-btn"
                            onClick={handleLogout}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                <polyline points="16,17 21,12 16,7"/>
                                <line x1="21" y1="12" x2="9" y2="12"/>
                            </svg>
                            Выйти
                        </button>
                    </div>
                </div>
                
                <div className="mobile-nav-overlay" onClick={closeMobileMenu}></div>
            </nav>
            
            {/* Десктопные действия пользователя */}
            <div className="header-actions">
                <div className="user-info" onClick={toggleUserDropdown}>
                    <Link to="/profile" className="user-avatar">
                        <div className="avatar-inner">
                            {getInitials(user?.name || user?.email)}
                        </div>
                    </Link>
                    <div className="user-details">
                        <div className="user-name">
                            {user?.name || user?.email || 'Загрузка...'}
                        </div>
                        <div className="user-role">
                            {isAdmin ? 'Администратор' : 'Пользователь'}
                        </div>
                    </div>
                    <div className={`user-dropdown ${isUserDropdownOpen ? 'active' : ''}`}>
                        <Link 
                            to="/profile" 
                            className="user-dropdown-item"
                            onClick={() => setIsUserDropdownOpen(false)}
                        >
                            <i className="fa fa-user"></i> Профиль
                        </Link>
                        <Link 
                            to="/settings" 
                            className="user-dropdown-item"
                            onClick={() => setIsUserDropdownOpen(false)}
                        >
                            <i className="fa fa-cog"></i> Настройки
                        </Link>
                        <div className="user-dropdown-divider"></div>
                        <button 
                            className="user-dropdown-item logout-btn"
                            onClick={handleLogout}
                        >
                            <i className="fa fa-sign-out-alt"></i> Выйти
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
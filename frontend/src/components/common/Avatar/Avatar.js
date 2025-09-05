import React from 'react';
import styles from './Avatar.module.css';

const Avatar = ({ 
    user, 
    size = 'medium', 
    className = '', 
    onClick = null,
    showBorder = false 
}) => {
    const getInitials = (username) => {
        if (!username) return 'АП';
        return username.slice(0, 2).toUpperCase();
    };

    const getSizeClass = () => {
        switch (size) {
            case 'small': return styles.small;
            case 'large': return styles.large;
            case 'xlarge': return styles.xlarge;
            default: return styles.medium;
        }
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    const avatarClasses = [
        styles.avatar,
        getSizeClass(),
        showBorder ? styles.withBorder : '',
        onClick ? styles.clickable : '',
        className
    ].filter(Boolean).join(' ');

    // Если есть avatar_url, показываем изображение
    if (user?.avatar_url) {
        return (
            <div 
                className={avatarClasses}
                onClick={handleClick}
                style={{ backgroundImage: `url(${user.avatar_url})` }}
            >
                {/* Fallback инициалы, если изображение не загрузится */}
                <span className={styles.fallback}>{getInitials(user.username)}</span>
            </div>
        );
    }

    // Иначе показываем инициалы с фоном
    return (
        <div 
            className={avatarClasses}
            onClick={handleClick}
        >
            <span className={styles.initials}>{getInitials(user?.username)}</span>
        </div>
    );
};

export default Avatar; 
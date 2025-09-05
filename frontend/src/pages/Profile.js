import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/common/Avatar/Avatar';
import AvatarChangeModal from '../components/modals/AvatarChangeModal/AvatarChangeModal';
import { useToast } from '../context/ToastContext';
import { useAuthUser, useProfileUpdate, useAuthStatus } from '../context/auth';
import { useApiQuery, useForm, useModal } from '../hooks';
import { useAuthService } from '../services/index.js';
import styles from '../styles/pages/Profile.module.css';
import { isValidEmail, isValidPhoneNumber, formatPhoneNumber } from '../utils/validationUtils';

function Profile() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const authUser = useAuthUser();
    const { updateProfile } = useProfileUpdate();
    const { isAuthenticated } = useAuthStatus();
    const authService = useAuthService();
    
    // Используем новые хуки
    const userApi = useApiQuery(() => authService.getCurrentUser(), { 
        queryKey: ['user', 'profile'],
        executeOnMount: false 
    });
    const avatarModal = useModal();
    
    // Форма профиля с валидацией
    const profileForm = useForm({
        username: '',
        email: '',
        phone: ''
    }, {
        username: (value) => !value.trim() ? 'Введите имя пользователя' : null,
        email: (value) => value && !isValidEmail(value) ? 'Некорректный формат email' : null,
        phone: (value) => value && !isValidPhoneNumber(value) ? 'Некорректный формат телефона' : null
    });
    
    // Форма смены пароля с валидацией
    const passwordForm = useForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    }, {
        currentPassword: (value) => !value ? 'Введите текущий пароль' : null,
        newPassword: (value) => value.length < 6 ? 'Минимум 6 символов' : null,
        confirmPassword: (value, formData) => value !== formData.newPassword ? 'Пароли не совпадают' : null
    });

    // UI состояние
    const [saving, setSaving] = useState(false);
    const passwordCardRef = useRef(null);

    // Вычисляемые значения
    const user = userApi.data || authUser;
    const {loading} = userApi;

    useEffect(() => {
        loadUserData();
    }, []);

    // Заполняем форму данными после загрузки пользователя
    useEffect(() => {
        if (user) {
            if (process.env.NODE_ENV === 'development') {
                console.log('Profile: Данные пользователя для формы:', user);
                console.log('Profile: Роль пользователя:', user.role);
            }
            profileForm.setFormValues({
                username: user.username || '',
                email: user.email || '',
                phone: user.phone_number || ''
            });
        }
    }, [user, profileForm.setFormValues]);

    const loadUserData = async () => {
        try {
            if (!isAuthenticated) {
                navigate('/login');
                return;
            }

            await userApi.execute();
        } catch (error) {
            showToast('Не удалось загрузить данные пользователя', 'error');
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Валидация через хук формы
            if (!profileForm.validate()) {
                return;
            }

            // Отправляем данные на сервер
            const updatedData = {
                username: profileForm.values.username.trim()
            };
            
            // Добавляем email только если он не пустой
            if (profileForm.values.email.trim()) {
                updatedData.email = profileForm.values.email.trim();
            }
            
            // Добавляем телефон только если он не пустой
            if (profileForm.values.phone.trim()) {
                updatedData.phone_number = profileForm.values.phone.trim();
            }

            const updatedUser = await authService.updateProfile(updatedData);
            
            // Сохраняем роль из текущего пользователя, если она отсутствует в ответе
            const userWithRole = {
                ...updatedUser,
                role: updatedUser.role || authUser?.role
            };
            
            // Обновляем пользователя в AuthContext
            updateProfile(userWithRole);
            
            // Успешное обновление
            showToast('Профиль успешно обновлен', 'success');
            
            // Обновляем данные пользователя в компоненте (но не перезаписываем AuthContext)
            // await userApi.execute();
            
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Ошибка обновления профиля:', error);
            }
            showToast(error.message || 'Ошибка при обновлении профиля', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Валидация через хук формы
            if (!passwordForm.validate()) {
                return;
            }

            // Используем новый метод для смены пароля
            await authService.changePassword(
                passwordForm.values.currentPassword,
                passwordForm.values.newPassword
            );
            
            // Очищаем поля пароля
            passwordForm.reset();
            
            // Анимация успешного обновления пароля
            if (passwordCardRef.current) {
                passwordCardRef.current.classList.add(styles.updateSuccess);
                setTimeout(() => {
                    passwordCardRef.current?.classList.remove(styles.updateSuccess);
                }, 1500);
            }
            
            showToast('Пароль успешно изменён', 'success');
            
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Ошибка смены пароля:', error);
            }
            if (error.message && error.message.includes('текущий пароль')) {
                showToast('Неверный текущий пароль', 'error');
            } else {
                showToast(error.message || 'Ошибка при изменении пароля', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePhoneBlur = () => {
        if (profileForm.values.phone.trim()) {
            profileForm.handleChange('phone', formatPhoneNumber(profileForm.values.phone));
        }
    };

    const handleAvatarChanged = () => {
        // Обновляем данные пользователя после смены аватара
        userApi.execute();
    };

    if (loading) {
        return (
            <div className={styles.profileContent}>
                <LoadingSpinner text="Загрузка профиля..." />
            </div>
        );
    }

    return (
        <main className={styles.profileContent}>
            {/* Навигация */}


            {/* Личная информация */}
            <div className={styles.profileSection}>
                <h2 className={styles.sectionTitle}>Личная информация</h2>
                <Card className={styles.profileCard}>
                    <div className={styles.profileHeader}>
                        <div className={styles.profileAvatar}>
                            <Avatar 
                                user={user} 
                                size="large" 
                                onClick={() => avatarModal.open()}
                                showBorder={true}
                            />
                            <button onClick={() => avatarModal.open()} className={styles.avatarEditButton} title="Изменить аватар">
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                                </svg>
                            </button>
                        </div>
                        <div className={styles.profileInfo}>
                            <div className={styles.profileName}>{user?.username || 'Загрузка...'}</div>
                            <div className={styles.profileRole}>
                                {typeof user?.role === 'string' ? user.role : (user?.role?.name || 'Без роли')}
                            </div>
                            <div className={styles.profileEmail}>
                                {user?.email || 'Email не указан'}
                            </div>
                        </div>
                    </div>

                    <form className={styles.profileForm} onSubmit={handleProfileSubmit}>
                        <div className={styles.formGroup}>
                            <label htmlFor="username">Имя пользователя</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                className={`${styles.formControl} ${profileForm.errors.username ? styles.error : ''}`}
                                value={profileForm.values.username}
                                onChange={profileForm.handleInputChange}
                                required
                            />
                            {profileForm.errors.username && (
                                <div className={styles.errorMessage}>{profileForm.errors.username}</div>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={`${styles.formControl} ${profileForm.errors.email ? styles.error : ''}`}
                                value={profileForm.values.email}
                                onChange={profileForm.handleInputChange}
                            />
                            {profileForm.errors.email && (
                                <div className={styles.errorMessage}>{profileForm.errors.email}</div>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="phone">Телефон</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                className={`${styles.formControl} ${profileForm.errors.phone ? styles.error : ''}`}
                                value={profileForm.values.phone}
                                onChange={profileForm.handleInputChange}
                                onBlur={handlePhoneBlur}
                            />
                            <small className={styles.formText}>Формат: +7 (999) 123-45-67</small>
                            {profileForm.errors.phone && (
                                <div className={styles.errorMessage}>{profileForm.errors.phone}</div>
                            )}
                        </div>

                        <div className={styles.formActions}>
                            <Button 
                                type="submit" 
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? 'Сохранение...' : 'Сохранить изменения'}
                            </Button>
                            <Button 
                                type="button"
                                variant="secondary"
                                onClick={() => navigate('/')}
                            >
                                Отменить
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>

            {/* Модальное окно смены аватара */}
            <AvatarChangeModal
                isOpen={avatarModal.isOpen}
                onClose={avatarModal.close}
                user={user}
                onAvatarChanged={handleAvatarChanged}
            />

            {/* Безопасность */}
            <div className={styles.profileSection}>
                <h2 className={styles.sectionTitle}>Безопасность</h2>
                <Card className={styles.profileCard} ref={passwordCardRef}>
                    <form className={styles.profileForm} onSubmit={handlePasswordSubmit}>
                        <div className={styles.formGroup}>
                            <label htmlFor="currentPassword">Текущий пароль</label>
                            <input
                                type="password"
                                id="currentPassword"
                                name="currentPassword"
                                className={`${styles.formControl} ${passwordForm.errors.currentPassword ? styles.error : ''}`}
                                value={passwordForm.values.currentPassword}
                                onChange={passwordForm.handleInputChange}
                            />
                            {passwordForm.errors.currentPassword && (
                                <div className={styles.errorMessage}>{passwordForm.errors.currentPassword}</div>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="newPassword">Новый пароль</label>
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                className={`${styles.formControl} ${passwordForm.errors.newPassword ? styles.error : ''}`}
                                value={passwordForm.values.newPassword}
                                onChange={passwordForm.handleInputChange}
                            />
                            {passwordForm.errors.newPassword && (
                                <div className={styles.errorMessage}>{passwordForm.errors.newPassword}</div>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="confirmPassword">Подтвердите пароль</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className={`${styles.formControl} ${passwordForm.errors.confirmPassword ? styles.error : ''}`}
                                value={passwordForm.values.confirmPassword}
                                onChange={passwordForm.handleInputChange}
                            />
                            {passwordForm.errors.confirmPassword && (
                                <div className={styles.errorMessage}>{passwordForm.errors.confirmPassword}</div>
                            )}
                        </div>

                        <div className={styles.formActions}>
                            <Button 
                                type="submit" 
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? 'Изменение...' : 'Изменить пароль'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>

        </main>
    );
}

export default Profile; 
 
 
 
 
 
 
 
 
 

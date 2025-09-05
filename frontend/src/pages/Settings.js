import React, { useEffect, Suspense, lazy  } from 'react';
import { useNavigate } from 'react-router-dom';

const Button = lazy(() => import('../components/ui/Button'));
const Card = lazy(() => import('../components/ui/Card'));
import { useAuthStatus } from '../context/auth';
import { useSettings } from '../hooks';
import styles from '../styles/pages/Settings.module.css';

function Settings() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStatus();
    const { settings, changeSetting, applySettings } = useSettings();
    
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Применяем сохраненные настройки при загрузке
        applySettings();
    }, [isAuthenticated, navigate, applySettings]);

    return (
        <main className={styles.settingsContent}>
            {/* Настройки */}
            <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>Настройки</h2>
                <Suspense fallback={<div>Загрузка...</div>}>
                    <Card className={styles.settingsCard}>
                        <div className={styles.settingsList}>
                            {/* Email notifications */}
                            <div className={styles.settingItem}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingTitle}>Уведомления по email</div>
                                    <div className={styles.settingDesc}>Получать уведомления о важных событиях</div>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={settings.emailNotifications}
                                        onChange={(e) => changeSetting('emailNotifications', e.target.checked)}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            {/* Dark theme */}
                            <div className={styles.settingItem}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingTitle}>Темная тема</div>
                                    <div className={styles.settingDesc}>Включить темную тему оформления</div>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={settings.darkTheme}
                                        onChange={(e) => changeSetting('darkTheme', e.target.checked)}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            {/* 2FA */}
                            <div className={styles.settingItem}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingTitle}>Двухфакторная аутентификация</div>
                                    <div className={styles.settingDesc}>Дополнительная защита вашего аккаунта</div>
                                </div>
                                <label className={styles.switch}>
                                    <input
                                        type="checkbox"
                                        checked={settings.twoFactorAuth}
                                        onChange={(e) => changeSetting('twoFactorAuth', e.target.checked)}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <Button
                                variant="secondary"
                                onClick={() => navigate('/')}
                            >
                                Назад
                            </Button>
                        </div>
                    </Card>
                </Suspense>
            </div>
        </main>
    );
}

export default Settings; 
 
 
 
 
 
 
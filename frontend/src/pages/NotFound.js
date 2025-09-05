
import { useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button.js';

/**
 * Страница 404 - Не найдено
 */
function NotFound() {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/', { replace: true });
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--background)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: 'var(--card-border-radius)',
                padding: '3rem',
                boxShadow: 'var(--box-shadow)',
                maxWidth: '500px',
                width: '100%'
            }}>
                <div style={{
                    fontSize: '6rem',
                    fontWeight: '700',
                    color: 'var(--primary)',
                    marginBottom: '1rem',
                    lineHeight: '1'
                }}>
                    404
                </div>
                
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '1rem'
                }}>
                    Страница не найдена
                </h1>
                
                <p style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '2rem',
                    lineHeight: '1.6'
                }}>
                    К сожалению, запрашиваемая страница не существует или была перемещена.
                </p>
                
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Button 
                        onClick={handleGoHome}
                        variant="primary"
                    >
                        На главную
                    </Button>
                    
                    <Button 
                        onClick={handleGoBack}
                        variant="secondary"
                    >
                        Назад
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default NotFound;

 
 
 
 
 
 
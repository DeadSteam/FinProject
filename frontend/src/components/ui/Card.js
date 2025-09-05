import React, { forwardRef } from 'react';

const Card = forwardRef(({ 
    children, 
    className = '', 
    hover = true,
    padding = true,
    onClick,
    clickable,
    ...props 
}, ref) => {
    const getCardClasses = () => {
        const classes = ['card'];
        
        if (!hover) {
            classes.push('card-no-hover');
        }
        
        if (!padding) {
            classes.push('card-no-padding');
        }
        
        if (onClick || clickable) {
            classes.push('card-clickable');
        }
        
        if (className) {
            classes.push(className);
        }
        
        return classes.join(' ');
    };

    return (
        <div
            ref={ref}
            className={getCardClasses()}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

export default React.memo(Card);
 
 
 
 
 
 
 
 
 
 
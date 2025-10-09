'use client';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import MagneticWrapper from './MagneticWrapper';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    disableMagnetic?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    className,
    children,
    disabled = false,
    disableMagnetic = false,
    ...props
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 900);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const baseStyles = 'font-mono font-medium transition-all duration-200';

    const variants = {
        primary: 'bg-gradient-to-br from-[#89CCBF] to-[#057C7C] text-white relative overflow-hidden',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        danger: 'bg-gradient-to-br from-[#FF6B6B] to-[#CC0000] text-white relative overflow-hidden'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg'
    };

    const handleMouseEnter = () => {
        if (!isMobile && !disabled) {
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile && !disabled) {
            setIsHovered(false);
        }
    };

    const button = (
        <button
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className,
                (variant === 'primary' || variant === 'danger') && !isMobile && !disabled && [
                    'shimmer-effect',
                    isHovered ? 'shimmer-forward' : 'shimmer-backward'
                ],
                disabled && 'opacity-50 cursor-not-allowed'
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );

    // Wrap with magnetic effect unless disabled
    if (disableMagnetic || disabled) {
        return button;
    }

    return (
        <MagneticWrapper disabled={disabled}>
            {button}
        </MagneticWrapper>
    );
};

export default Button;

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div
            className={cn(
                'border-2 border-[#9FA493] p-6 hover:shadow-[4px_4px_0_0_#9ea393] transition-all duration-300 ease-out hover:-translate-x-1 hover:-translate-y-1',
                className
            )}
        >
            {children}
        </div>
    );
};

export default Card;

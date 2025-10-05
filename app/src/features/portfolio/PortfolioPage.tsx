import React from 'react';
import { cn } from '@/lib/utils';

interface PortfolioPageProps {
    className?: string;
}

const PortfolioPage: React.FC<PortfolioPageProps> = ({ className }) => {
    return (
        <div className={cn('min-h-screen flex items-center justify-center', className)}>
            <div className="text-center">
                <h1 className="font-mono text-4xl font-bold mb-4">
                    Portfolio Page
                </h1>
                <p className="font-mono text-lg">
                    This page is coming soon...
                </p>
            </div>
        </div>
    );
};

export default PortfolioPage;

import React from 'react';
import { cn } from '@/lib/utils';

interface OffRampPageProps {
    className?: string;
}

const OffRampPage: React.FC<OffRampPageProps> = ({ className }) => {
    return (
        <div className={cn('min-h-screen flex items-center justify-center', className)}>
            <div className="text-center">
                <h1 className="font-mono text-4xl font-bold text-gray-800 mb-4">
                    Off-Ramp Page
                </h1>
                <p className="font-mono text-lg text-gray-600">
                    This page is coming soon...
                </p>
            </div>
        </div>
    );
};

export default OffRampPage;

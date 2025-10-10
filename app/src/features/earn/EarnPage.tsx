'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import HeroSection from '@/components/earn/HeroSection';
import Pools from '@/components/earn/Pools';

interface EarnPageProps {
    className?: string;
}

const EarnPage: React.FC<EarnPageProps> = ({ className }) => {
    return (
        <div className={cn('min-h-screen', className)}>
            <HeroSection />
            <Pools />
        </div>
    );
};

export default EarnPage;

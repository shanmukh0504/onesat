import React from 'react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
    className?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ className }) => {
    return (
        <section className={cn('w-full px-4 sm:px-6 lg:px-8 pt-12 md:py-20', className)}>
            <div className="max-w-7xl mx-auto">
                <div className="grid sm:grid-cols-2 grid-cols-1 gap-8 lg:gap-12 items-center justify-center">
                    <div className="space-y-6 justify-center">
                        <h1 className="font-mono text-2xl sm:text-3xl lg:text-5xl text-gray-800 leading-tight text-center sm:text-left">
                            Earn Yield on Your Bitcoin, Instantly.
                        </h1>
                    </div>

                    <div className="flex justify-center sm:justify-end">
                        <p className="font-mono text-sm sm:text-md xl:text-lg text-gray-700 max-w-md sm:text-right text-center">
                            Deposit native BTC (on-chain or Lightning) and start earning in one click – no wrapping, no hassle.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;

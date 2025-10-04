"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface NavbarProps {
    className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const leftNavigationItems = [
        { label: 'earn', href: '/earn' },
        { label: 'off-ramp', href: '/off-ramp' },
    ];

    const rightNavigationItems = [
        { label: 'portfolio', href: '/portfolio' },
    ];

    const allNavigationItems = [...leftNavigationItems, ...rightNavigationItems];

    return (
        <nav className={cn('w-full px-4 sm:px-6 lg:px-8 py-6 relative', className)}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-12">
                    <div className="flex items-center">
                        <Link href="/">
                            <Image
                                src="/onesat.svg"
                                alt="OneSat Logo"
                                width={128}
                                height={128}
                            />
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-12">
                        {leftNavigationItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="font-mono text-gray-700 hover:text-gray-900 transition-colors duration-200"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="hidden md:flex items-center space-x-12">
                    {rightNavigationItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="font-mono text-gray-700 hover:text-gray-900 transition-colors duration-200"
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Button variant="primary" size="md">
                        Connect Wallet
                    </Button>
                </div>

                <button
                    className="md:hidden p-2"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                        <span className={cn('block h-0.5 w-6 bg-gray-800 transition-all duration-300', isMenuOpen && 'rotate-45 translate-y-1.5')} />
                        <span className={cn('block h-0.5 w-6 bg-gray-800 transition-all duration-300', isMenuOpen && 'opacity-0')} />
                        <span className={cn('block h-0.5 w-6 bg-gray-800 transition-all duration-300', isMenuOpen && '-rotate-45 -translate-y-1.5')} />
                    </div>
                </button>
            </div>

            {isMenuOpen && (
                <div className="md:hidden mt-4 py-4 border-t border-gray-200">
                    <div className="flex flex-col space-y-4">
                        {allNavigationItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="font-mono text-gray-700 hover:text-gray-900 transition-colors duration-200 px-4"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="px-4">
                            <Button variant="primary" className="w-full">
                                Connect Wallet
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;

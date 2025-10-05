"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import AnimatedLink from '@/components/ui/AnimatedLink';
import { cn } from '@/lib/utils';
import { useWallet } from '@/store/useWallet';

interface NavbarProps {
    className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ className }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const {
        isXverseAvailable,
        isConnecting,
        connected,
        bitcoinPaymentAddress,
        stacksAddress,
        starknetAddress,
        detectProviders,
        connect,
        disconnect,
    } = useWallet();

    const [isAddressMenuOpen, setIsAddressMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target as Node)) {
                setIsAddressMenuOpen(false);
            }
        };
        document.addEventListener('click', onClickOutside);
        return () => document.removeEventListener('click', onClickOutside);
    }, []);

    const short = (addr?: string | null, leading: number = 4, trailing: number = 4) => {
        if (!addr) return '';
        if (addr.length <= leading + trailing + 3) return addr;
        return `${addr.slice(0, leading)}...${addr.slice(-trailing)}`;
    };

    useEffect(() => {
        detectProviders();
    }, [detectProviders]);

    const onConnectWallet = async () => {
        await connect();
    };

    const leftNavigationItems = [
        { label: 'Earn', href: '/earn' },
        { label: 'Off-ramp', href: '/off-ramp' },
    ];

    const rightNavigationItems = [
        { label: 'Portfolio', href: '/portfolio' },
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
                            <AnimatedLink
                                key={item.label}
                                href={item.href}
                                variant="default"
                            >
                                {item.label}
                            </AnimatedLink>
                        ))}
                    </div>
                </div>

                <div className="hidden md:flex items-center space-x-12">
                    {rightNavigationItems.map((item) => (
                        <AnimatedLink
                            key={item.label}
                            href={item.href}
                            variant="default"
                        >
                            {item.label}
                        </AnimatedLink>
                    ))}
                    <div className="flex items-center space-x-4" ref={menuRef}>
                        {!connected ? (
                            <Button variant="primary" size="md" onClick={onConnectWallet} disabled={isConnecting}>
                                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
                            </Button>
                        ) : (
                            <>
                                <button
                                    className="font-mono text-sm flex items-center space-x-2 px-3 py-2 rounded-full border border-gray-300 hover:bg-gray-50"
                                    onClick={() => setIsAddressMenuOpen((v) => !v)}
                                >
                                    <span className="inline-block w-6 h-6 rounded-full bg-[#E6F2FF] border border-[#C6DFFF]" />
                                    <span>{short(bitcoinPaymentAddress || starknetAddress || stacksAddress)}</span>
                                    <span className="text-gray-600">{isAddressMenuOpen ? '▴' : '▾'}</span>
                                </button>
                                {isAddressMenuOpen && (
                                    <div className="absolute right-8 top-16 z-50 w-80 rounded-md border border-gray-200 bg-white shadow-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-mono opacity-70">{isXverseAvailable ? 'Xverse detected' : 'Xverse not detected'}</span>
                                            <button className="text-xs underline" onClick={() => setIsAddressMenuOpen(false)}>close</button>
                                        </div>
                                        <div className="space-y-2 text-sm font-mono">
                                            {bitcoinPaymentAddress && (
                                                <div className="flex items-center justify-between">
                                                    <span className="opacity-70">Bitcoin</span>
                                                    <span className="truncate max-w-[60%]" title={bitcoinPaymentAddress}>{short(bitcoinPaymentAddress, 6, 6)}</span>
                                                </div>
                                            )}
                                            {starknetAddress && (
                                                <div className="flex items-center justify-between">
                                                    <span className="opacity-70">Starknet</span>
                                                    <span className="truncate max-w-[60%]" title={starknetAddress}>{short(starknetAddress, 6, 6)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 border-t pt-3 flex items-center justify-between">
                                            <Button size="sm" variant="outline" onClick={() => { disconnect(); setIsAddressMenuOpen(false); }}>Disconnect</Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <button
                    className="md:hidden p-2"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                        <span className={cn('block h-0.5 w-6 transition-all duration-300', isMenuOpen && 'rotate-45 translate-y-1.5')} />
                        <span className={cn('block h-0.5 w-6 transition-all duration-300', isMenuOpen && 'opacity-0')} />
                        <span className={cn('block h-0.5 w-6 transition-all duration-300', isMenuOpen && '-rotate-45 -translate-y-1.5')} />
                    </div>
                </button>
            </div>

            {isMenuOpen && (
                <div className="md:hidden mt-4 py-4 border-t border-gray-200">
                    <div className="flex flex-col space-y-4">
                        {allNavigationItems.map((item) => (
                            <AnimatedLink
                                key={item.label}
                                href={item.href}
                                variant="mobile"
                                className="px-4"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item.label}
                            </AnimatedLink>
                        ))}
                        <div className="px-4 space-y-2">
                            <Button variant="primary" className="w-full" onClick={onConnectWallet} disabled={isConnecting}>
                                {isConnecting ? 'Connecting…' : bitcoinPaymentAddress ? 'Connected' : 'Connect Wallet'}
                            </Button>
                            <div className="flex flex-col text-xs font-mono text-gray-700">
                                <span className="opacity-70">{isXverseAvailable ? 'Xverse detected' : 'Xverse not detected'}</span>
                                {bitcoinPaymentAddress && (
                                    <span>BTC: {bitcoinPaymentAddress}</span>
                                )}
                                {starknetAddress && (
                                    <span>Starknet: {starknetAddress}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Button from "../ui/Button";
import Image from "next/image";
import { useWallet } from "@/store/useWallet";

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: any;
    onWithdraw: (amount: string) => Promise<void>;
    maxWithdraw: string;
    isLoading?: boolean;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
    isOpen,
    onClose,
    position,
    onWithdraw,
    maxWithdraw,
    isLoading = false,
}) => {
    const { connected, connectStarknet, isConnecting, starknetAddress } = useWallet();
    const [amount, setAmount] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRetryingConnection, setIsRetryingConnection] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setAmount("");
            setError(null);
            setIsWithdrawing(false);
            setIsRetryingConnection(false);
        }
    }, [isOpen]);

    const handleRetryConnection = async () => {
        setIsRetryingConnection(true);
        try {
            await connectStarknet();
        } catch (error) {
            console.error('Failed to reconnect wallet:', error);
            setError('Failed to reconnect wallet. Please try again.');
        } finally {
            setIsRetryingConnection(false);
        }
    };

    const handleWithdraw = async () => {
        if (!connected || !starknetAddress) {
            setError('Wallet not connected. Please reconnect your wallet.');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        const amountFloat = parseFloat(amount);
        const maxAmount = parseFloat(maxWithdrawFormatted);

        if (amountFloat > maxAmount) {
            setError(`Amount cannot exceed ${maxAmount.toFixed(8)}`);
            return;
        }

        setIsWithdrawing(true);
        setError(null);

        try {
            await onWithdraw(amount);
            onClose();
        } catch (error: any) {
            setError(error?.message || 'Withdrawal failed');
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (!isOpen) return null;

    const formatValue = (value: string, decimals: number) => {
        const num = parseFloat(value) / Math.pow(10, decimals);
        if (num < 0.01) {
            return num.toFixed(8);
        } else if (num < 1) {
            return num.toFixed(6);
        } else if (num < 10) {
            return num.toFixed(4);
        } else {
            return num.toFixed(2);
        }
    };

    const currentValue = formatValue(
        position?.collateral.value || "0",
        position?.collateral.decimals || 8
    );

    const maxWithdrawFormatted = formatValue(
        maxWithdraw,
        position?.collateral.decimals || 8
    );

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only numbers and decimals
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setAmount(value);
            setError(null);
        }
    };

    const handleMaxClick = () => {
        setAmount(maxWithdrawFormatted);
        setError(null);
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 space-y-4 xs:space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="font-mono text-xl xs:text-2xl font-bold">
                        Withdraw from Pool
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={isWithdrawing}
                    >
                        <svg
                            className="w-5 h-5 xs:w-6 xs:h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Pool Info */}
                <div className="flex items-center gap-2 xs:gap-3 p-3 xs:p-4 bg-gray-50 rounded">
                    <div className="w-8 h-8 xs:w-10 xs:h-10 flex items-center justify-center bg-gray-200 rounded">
                        <Image
                            src={position?.collateral.icon_url || "https://vesu.xyz/img/curator-logos/vesu-light.png"}
                            alt={position?.pool.name || "Pool"}
                            width={24}
                            height={24}
                            className="w-5 h-5 xs:w-6 xs:h-6"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-sm xs:text-base">
                            {position?.pool.name || "Genesis Pool"}
                        </div>
                        <div className="text-xs xs:text-sm text-gray-600">
                            {position?.collateral.symbol || "WBTC"}
                        </div>
                    </div>
                </div>

                {/* Current Balance */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs xs:text-sm text-gray-600">
                        <span>Your Balance</span>
                        <span className="font-mono">{currentValue} {position?.collateral.symbol}</span>
                    </div>
                    <div className="flex justify-between text-xs xs:text-sm text-gray-600">
                        <span>Max Withdrawable</span>
                        <span className="font-mono">{maxWithdrawFormatted} {position?.collateral.symbol}</span>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="block text-sm xs:text-base font-medium">
                        Withdraw Amount
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0.00"
                            disabled={isWithdrawing || isLoading}
                            className={cn(
                                "w-full px-3 xs:px-4 py-2 xs:py-3 pr-16 xs:pr-20",
                                "font-mono text-base xs:text-lg",
                                "bg-gray-50 border border-gray-200 rounded",
                                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "transition-all"
                            )}
                        />
                        <button
                            onClick={handleMaxClick}
                            disabled={isWithdrawing || isLoading}
                            className={cn(
                                "absolute right-2 xs:right-3 top-1/2 -translate-y-1/2",
                                "px-2 xs:px-3 py-1 text-xs xs:text-sm font-medium",
                                "bg-gray-200 hover:bg-gray-300 rounded transition-colors",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            MAX
                        </button>
                    </div>
                    {error && (
                        <p className="text-xs xs:text-sm text-red-500 font-mono">{error}</p>
                    )}
                </div>

                {/* Wallet Connection Status */}
                {(!connected || !starknetAddress) && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800 font-mono mb-2">
                            Wallet not connected
                        </p>
                        <Button
                            variant="primary"
                            onClick={handleRetryConnection}
                            disabled={isRetryingConnection || isConnecting}
                            className="w-full"
                        >
                            {isRetryingConnection || isConnecting ? "Connecting..." : "Reconnect Wallet"}
                        </Button>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isWithdrawing}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleWithdraw}
                        disabled={isWithdrawing || isLoading || !amount || !connected || !starknetAddress}
                        className="flex-1"
                    >
                        {isWithdrawing ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Withdrawing...</span>
                            </div>
                        ) : (
                            "Withdraw"
                        )}
                    </Button>
                </div>

                {/* Info */}
                <div className="text-xs xs:text-sm text-gray-600 text-center font-mono">
                    Withdrawing will reduce your position in this pool
                </div>

                {/* Gas Fee Info */}
                <div className="text-xs xs:text-sm text-blue-600 text-center font-mono bg-blue-50 p-2 rounded">
                    💡 Need gas fees? Get testnet ETH from <a href="https://starknet-faucet.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline">Starknet Faucet</a>
                </div>
            </div>
        </div>
    );
};


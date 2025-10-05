'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import defaultWallet, { AddressPurpose, RpcErrorCode } from 'sats-connect';

type NumericString = string; // keep balances as strings to avoid float issues

type Balances = {
    btc?: NumericString | null; // in sats
    stacks?: NumericString | null; // in uSTX
    starknet?: NumericString | null; // in wei
};

type WalletState = {
    // detection
    isXverseAvailable: boolean;

    // connection state
    isConnecting: boolean;
    connected: boolean;

    // addresses
    bitcoinPaymentAddress: string | null;
    bitcoinOrdinalsAddress: string | null;
    stacksAddress: string | null;
    starknetAddress: string | null;

    // balances
    balances: Balances;

    // actions
    detectProviders: () => void;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    refreshBalances: () => Promise<void>;
};

async function fetchBitcoinBalanceSats(address: string): Promise<NumericString | null> {
    try {
        const res = await fetch(`https://blockstream.info/api/address/${address}`);
        if (!res.ok) return null;
        const data = await res.json();
        const confirmed = (data?.chain_stats?.funded_txo_sum ?? 0) - (data?.chain_stats?.spent_txo_sum ?? 0);
        const mempool = (data?.mempool_stats?.funded_txo_sum ?? 0) - (data?.mempool_stats?.spent_txo_sum ?? 0);
        const total = confirmed + mempool;
        return String(total);
    } catch {
        return null;
    }
}

async function fetchStacksBalanceUstx(address: string): Promise<NumericString | null> {
    try {
        const res = await fetch(`https://api.mainnet.hiro.so/v2/accounts/${address}?proof=0`);
        if (!res.ok) return null;
        const data = await res.json();
        const balance = data?.balance;
        return typeof balance === 'string' ? balance : balance != null ? String(balance) : null;
    } catch {
        return null;
    }
}

async function resolveStarknetInjectedAddress(): Promise<string | null> {
    try {
        const anyWindow = window as any;
        const provider = anyWindow?.starknet || anyWindow?.starknet_argentX || anyWindow?.starknet_braavos;
        if (!provider) return null;
        await provider.enable?.();
        const accounts = provider?.accounts;
        const candidate = Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : provider?.selectedAddress;
        return typeof candidate === 'string' ? candidate : null;
    } catch {
        return null;
    }
}

export const useWallet = create<WalletState>()(
    persist(
        (set, get) => ({
            isXverseAvailable: false,
            isConnecting: false,
            connected: false,
            bitcoinPaymentAddress: null,
            bitcoinOrdinalsAddress: null,
            stacksAddress: null,
            starknetAddress: null,
            balances: {},

            detectProviders: () => {
                if (typeof window === 'undefined') return;
                const hasBitcoinProvider = Boolean((window as any).btc || (window as any).BitcoinProvider);
                set({ isXverseAvailable: hasBitcoinProvider });
            },

            connect: async () => {
                try {
                    set({ isConnecting: true });
                    const response = await defaultWallet.request('wallet_connect', null);
                    if (response.status === 'success') {
                        const addresses = response.result.addresses || [];
                        const payment = addresses.find((a: any) => a.purpose === AddressPurpose.Payment)?.address || null;
                        const ordinals = addresses.find((a: any) => a.purpose === AddressPurpose.Ordinals)?.address || null;
                        const stacks = addresses.find((a: any) => a.purpose === AddressPurpose.Stacks)?.address || null;
                        const starknet = await resolveStarknetInjectedAddress();

                        set({
                            bitcoinPaymentAddress: payment,
                            bitcoinOrdinalsAddress: ordinals,
                            stacksAddress: stacks,
                            starknetAddress: starknet,
                            connected: true,
                        });

                        await get().refreshBalances();
                    } else {
                        if (response.error.code === RpcErrorCode.USER_REJECTION) {
                            // user cancelled, keep state
                        } else {
                            alert(response.error.message || 'Failed to connect wallet');
                        }
                    }
                } catch (err: any) {
                    const message = err?.error?.message || err?.message || 'Unexpected error while connecting wallet';
                    alert(message);
                } finally {
                    set({ isConnecting: false });
                }
            },

            disconnect: async () => {
                try {
                    await defaultWallet.disconnect();
                } catch {
                    // ignore
                }
                set({
                    connected: false,
                    bitcoinPaymentAddress: null,
                    bitcoinOrdinalsAddress: null,
                    stacksAddress: null,
                    starknetAddress: null,
                    balances: {},
                });
            },

            refreshBalances: async () => {
                const { bitcoinPaymentAddress, stacksAddress } = get();
                const [btc, stx] = await Promise.all([
                    bitcoinPaymentAddress ? fetchBitcoinBalanceSats(bitcoinPaymentAddress) : Promise.resolve(null),
                    stacksAddress ? fetchStacksBalanceUstx(stacksAddress) : Promise.resolve(null),
                ]);
                set({ balances: { ...get().balances, btc, stacks: stx } });
                // Starknet balance retrieval requires a JSON-RPC provider; leaving as null for now
            },
        }),
        {
            name: 'wallet-store',
            partialize: (state) => ({
                isXverseAvailable: state.isXverseAvailable,
                connected: state.connected,
                bitcoinPaymentAddress: state.bitcoinPaymentAddress,
                bitcoinOrdinalsAddress: state.bitcoinOrdinalsAddress,
                stacksAddress: state.stacksAddress,
                starknetAddress: state.starknetAddress,
                balances: state.balances,
            }),
        }
    )
);



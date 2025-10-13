'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ChainDataContext, ChainWalletData } from './ChainDataContext';
import { XverseBitcoinWallet } from '@/lib/bitcoin/XverseBitcoinWallet';
import { UnisatBitcoinWallet } from '@/lib/bitcoin/UnisatBitcoinWallet';
import { BitcoinNetwork } from '@atomiqlabs/sdk';
import { StarknetSigner, StarknetFees, RpcProviderWithRetries } from '@atomiqlabs/chain-starknet';
import { connect, disconnect, StarknetWindowObject } from '@starknet-io/get-starknet';
import { WalletAccount, wallet } from 'starknet';

const BITCOIN_NETWORK = BitcoinNetwork.TESTNET4;
const BITCOIN_RPC_URL = 'https://mempool.space/testnet4/api';
const STARKNET_RPC_URL = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';
const STARKNET_CHAIN_ID = '0x534e5f5345504f4c4941'; // SN_SEPOLIA

export function ChainDataProvider({ children }: { children: React.ReactNode }) {
    // Bitcoin wallet state
    const [bitcoinWallet, setBitcoinWallet] = useState<XverseBitcoinWallet | UnisatBitcoinWallet | null>(null);
    const [bitcoinWalletType, setBitcoinWalletType] = useState<'xverse' | 'unisat' | null>(null);

    // Starknet wallet state
    const [starknetSigner, setStarknetSigner] = useState<StarknetSigner | null>(null);
    const [starknetWalletData, setStarknetWalletData] = useState<StarknetWindowObject | null>(null);

    // Check wallet availability
    const [isXverseAvailable, setIsXverseAvailable] = useState(false);
    const [isUnisatAvailable, setIsUnisatAvailable] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        // Check for Bitcoin wallets
        const checkWallets = () => {
            const hasXverse = Boolean((window as any).BitcoinProvider);
            const hasUnisat = Boolean((window as any).unisat);
            
            setIsXverseAvailable(hasXverse);
            setIsUnisatAvailable(hasUnisat);
            
            console.log('Wallet availability:', { hasXverse, hasUnisat });
        };

        checkWallets();
        
        // Recheck after a delay (some wallets inject asynchronously)
        const timer = setTimeout(checkWallets, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Bitcoin wallet connection
    const connectBitcoinWallet = useCallback(async (walletType: 'xverse' | 'unisat') => {
        try {
            console.log(`Connecting ${walletType} wallet...`);
            let wallet: XverseBitcoinWallet | UnisatBitcoinWallet;

            if (walletType === 'xverse') {
                wallet = await XverseBitcoinWallet.connect(BITCOIN_NETWORK, BITCOIN_RPC_URL);
            } else {
                wallet = await UnisatBitcoinWallet.connect(BITCOIN_NETWORK, BITCOIN_RPC_URL);
            }

            setBitcoinWallet(wallet);
            setBitcoinWalletType(walletType);
            console.log(`${walletType} wallet connected:`, wallet.getReceiveAddress());
        } catch (error) {
            console.error(`Failed to connect ${walletType} wallet:`, error);
            throw error;
        }
    }, []);

    const disconnectBitcoinWallet = useCallback(() => {
        console.log('Disconnecting Bitcoin wallet...');
        setBitcoinWallet(null);
        setBitcoinWalletType(null);
    }, []);

    // Starknet wallet connection
    const connectStarknetWallet = useCallback(async () => {
        try {
            console.log('Connecting Starknet wallet...');
            const swo = await connect({ modalMode: 'alwaysAsk', modalTheme: 'dark' });
            
            if (!swo) {
                throw new Error('Failed to connect Starknet wallet');
            }

            const walletAccount = await WalletAccount.connect(
                new RpcProviderWithRetries({ nodeUrl: STARKNET_RPC_URL }),
                swo
            );

            const chainId = await wallet.requestChainId(walletAccount.walletProvider);
            console.log('Starknet wallet chainId:', chainId);

            if (chainId !== STARKNET_CHAIN_ID) {
                console.warn('Wrong Starknet network. Expected Sepolia.');
                // Still connect but warn the user
            }

            // Wait for address to be populated
            const maxAttempts = 50;
            for (let i = 0; i < maxAttempts; i++) {
                if (walletAccount.address !== '0x0000000000000000000000000000000000000000000000000000000000000000' && walletAccount.address !== '') {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const signer = new StarknetSigner(walletAccount);
            setStarknetSigner(signer);
            setStarknetWalletData(swo);
            
            console.log('Starknet wallet connected:', signer.getAddress());

            // Listen for account changes
            const listener = (accounts: string[] | undefined) => {
                console.log('Starknet account changed:', accounts);
                if (accounts && accounts.length > 0) {
                    const newSigner = new StarknetSigner(walletAccount);
                    setStarknetSigner(newSigner);
                } else {
                    setStarknetSigner(null);
                }
            };
            swo.on('accountsChanged', listener);

        } catch (error) {
            console.error('Failed to connect Starknet wallet:', error);
            throw error;
        }
    }, []);

    const disconnectStarknetWallet = useCallback(async () => {
        try {
            console.log('Disconnecting Starknet wallet...');
            await disconnect({ clearLastWallet: true });
            setStarknetSigner(null);
            setStarknetWalletData(null);
        } catch (error) {
            console.error('Failed to disconnect Starknet wallet:', error);
        }
    }, []);

    // Prepare context value
    const contextValue = useMemo(() => {
        const value: any = {};

        // Bitcoin chain data
        value.BITCOIN = {
            chain: {
                name: 'Bitcoin',
                icon: '/icons/bitcoin.svg'
            },
            wallet: bitcoinWallet ? {
                name: bitcoinWallet.getName(),
                icon: bitcoinWallet.getIcon(),
                address: bitcoinWallet.getReceiveAddress(),
                instance: bitcoinWallet
            } : null,
            id: 'BITCOIN',
            connect: isXverseAvailable || isUnisatAvailable ? async () => {
                // Default to Xverse if available, otherwise Unisat
                const walletType = isXverseAvailable ? 'xverse' : 'unisat';
                await connectBitcoinWallet(walletType);
            } : undefined,
            disconnect: bitcoinWallet ? disconnectBitcoinWallet : undefined,
            changeWallet: bitcoinWallet && isXverseAvailable && isUnisatAvailable ? async () => {
                disconnectBitcoinWallet();
                const newWalletType = bitcoinWalletType === 'xverse' ? 'unisat' : 'xverse';
                await connectBitcoinWallet(newWalletType);
            } : undefined
        };

        // Starknet chain data
        value.STARKNET = {
            chain: {
                name: 'Starknet',
                icon: '/icons/starknet.svg'
            },
            wallet: starknetSigner ? {
                name: starknetWalletData?.name || 'Starknet Wallet',
                icon: typeof starknetWalletData?.icon !== 'string' 
                    ? starknetWalletData?.icon?.dark || '/icons/starknet.svg'
                    : starknetWalletData?.icon,
                address: starknetSigner.getAddress(),
                instance: starknetSigner
            } : null,
            id: 'STARKNET',
            connect: connectStarknetWallet,
            disconnect: starknetSigner ? disconnectStarknetWallet : undefined,
            swapperOptions: {
                rpcUrl: new RpcProviderWithRetries({ nodeUrl: STARKNET_RPC_URL }),
                chainId: STARKNET_CHAIN_ID,
                fees: new StarknetFees(new RpcProviderWithRetries({ nodeUrl: STARKNET_RPC_URL }))
            }
        };

        return value;
    }, [
        bitcoinWallet,
        bitcoinWalletType,
        isXverseAvailable,
        isUnisatAvailable,
        starknetSigner,
        starknetWalletData,
        connectBitcoinWallet,
        disconnectBitcoinWallet,
        connectStarknetWallet,
        disconnectStarknetWallet
    ]);

    return (
        <ChainDataContext.Provider value={contextValue}>
            {children}
        </ChainDataContext.Provider>
    );
}


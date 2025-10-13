"use client";

import React, { useContext, useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
    BitcoinNetwork,
    FeeType,
    SwapperFactory,
} from '@atomiqlabs/sdk';
import {
    RpcProviderWithRetries,
    StarknetInitializer,
    StarknetInitializerType,
} from '@atomiqlabs/chain-starknet';
import Navbar from '@/components/layout/Navbar';
import { ChainDataContext } from '../context/ChainDataContext';

const factory = new SwapperFactory<[StarknetInitializerType]>([StarknetInitializer]);
const Tokens = factory.Tokens;

export default function SwapPage() {
    const chainData = useContext(ChainDataContext);
    const bitcoinChainData = chainData.BITCOIN;
    const starknetChainData = chainData.STARKNET;

    const [starknetRpcUrl] = useState<string>('https://starknet-sepolia.public.blastapi.io/rpc/v0_7');
    const [amountBtc, setAmountBtc] = useState<string>('0.00003');
    const [dstToken, setDstToken] = useState<'ETH' | 'STRK'>('ETH');
    const [isInitializing, setIsInitializing] = useState<boolean>(false);
    const [isSwapping, setIsSwapping] = useState<boolean>(false);
    const [logs, setLogs] = useState<string[]>([]);

    const btcNetwork = BitcoinNetwork.TESTNET4;
    const bitcoinAddress = bitcoinChainData?.wallet?.address;
    const starknetAddress = starknetChainData?.wallet?.address;
    const connected = Boolean(bitcoinAddress && starknetAddress);

    const swapper = useMemo(() => {
        const rpc = new RpcProviderWithRetries({ nodeUrl: starknetRpcUrl });
        return factory.newSwapper({
            chains: { STARKNET: { rpcUrl: rpc } },
            bitcoinNetwork: btcNetwork,
        });
    }, [btcNetwork, starknetRpcUrl]);

    const log = (line: string) => {
        console.log(line);
        setLogs((l) => [...l, line]);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsInitializing(true);
            try {
                await swapper.init();
                if (!cancelled) log('Swapper initialized (BTC: TESTNET4, Starknet: SEPOLIA)');
            } catch (e: any) {
                if (!cancelled) log('Failed to initialize: ' + (e?.message || String(e)));
            } finally {
                if (!cancelled) setIsInitializing(false);
            }
        })();
        return () => {
            cancelled = true;
            void swapper.stop();
        };
    }, [swapper]);

    const handleSwap = async () => {
        if (!connected || !bitcoinAddress || !starknetAddress) {
            alert('Please connect both Bitcoin and Starknet wallets first.');
            return;
        }

        if (!bitcoinChainData?.wallet?.instance) {
            alert('Bitcoin wallet instance not available');
            return;
        }

        try {
            setIsSwapping(true);
            log('Starting swap...');
            
            const amountInSats = BigInt(Math.floor(Number(amountBtc) * 1e8));
            log(`Amount: ${amountBtc} BTC (${amountInSats.toString()} sats)`);

            const token = dstToken === 'ETH' ? Tokens.STARKNET.ETH : Tokens.STARKNET.STRK;

            log('Creating swap...');
            const swap = await swapper.swap(
                Tokens.BITCOIN.BTC,
                token,
                amountInSats,
                true,
                undefined,
                starknetAddress,
                {}
            );

            log('Swap created: ' + swap.getId());
            log('Input (no fee): ' + swap.getInputWithoutFee().toString() + ' sats');
            log('Fees: ' + swap.getFee().amountInSrcToken.toString() + ' sats');
            for (const fee of swap.getFeeBreakdown()) {
                log(' - ' + FeeType[fee.type] + ': ' + fee.fee.amountInSrcToken.toString() + ' sats');
            }
            log('Output: ' + swap.getOutput().toString());

            // Send Bitcoin transaction using the wallet adapter
            log('Requesting wallet to sign and broadcast transaction...');
            const txId = await swap.sendBitcoinTransaction(bitcoinChainData.wallet.instance);
            log('Bitcoin transaction sent: ' + txId);

            log('Waiting for Bitcoin transaction confirmation...');
            await swap.waitForBitcoinTransaction(undefined, 1, () => {});
            log('Bitcoin transaction confirmed!');

            log('Waiting for claim...');
            try {
                await swap.waitTillClaimedOrFronted(AbortSignal.timeout(60 * 1000));
                log('✅ Successfully claimed by watchtower!');
            } catch {
                log('⏳ Auto-claim not detected yet, watchtower will process it soon.');
            }
        } catch (e: any) {
            console.error('Swap error:', e);
            log('❌ Swap failed: ' + (e?.message || String(e)));
        } finally {
            setIsSwapping(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-10">
                <h1 className="text-2xl font-mono mb-6">Swap BTC to Starknet</h1>
                
                {/* Network Info */}
                <div className="mb-4 text-xs font-mono p-3 border rounded-md bg-gray-50  ">
                    <div className="font-semibold mb-2">Network Configuration:</div>
                    <div>• Bitcoin: Testnet4</div>
                    <div>• Starknet: Sepolia</div>
                </div>

                {/* Connection Status */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-md">
                        <div className="text-sm font-mono mb-2">Bitcoin Wallet</div>
                        {bitcoinChainData?.wallet ? (
                            <>
                                <div className="text-xs text-gray-600   mb-2">
                                    {bitcoinChainData.wallet.name}
                                </div>
                                <div className="text-xs font-mono break-all bg-gray-100   p-2 rounded">
                                    {bitcoinAddress}
                                </div>
                                {bitcoinChainData.disconnect && (
                                    <button
                                        onClick={() => bitcoinChainData.disconnect?.()}
                                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                                    >
                                        Disconnect
                                    </button>
                                )}
                            </>
                        ) : (
                            <Button
                                onClick={() => bitcoinChainData?.connect?.()}
                                disabled={!bitcoinChainData?.connect}
                                className="w-full"
                            >
                                Connect Bitcoin
                            </Button>
                        )}
                    </div>

                    <div className="p-4 border rounded-md">
                        <div className="text-sm font-mono mb-2">Starknet Wallet</div>
                        {starknetChainData?.wallet ? (
                            <>
                                <div className="text-xs text-gray-600   mb-2">
                                    {starknetChainData.wallet.name}
                                </div>
                                <div className="text-xs font-mono break-all bg-gray-100   p-2 rounded">
                                    {starknetAddress}
                                </div>
                                {starknetChainData.disconnect && (
                                    <button
                                        onClick={() => starknetChainData.disconnect?.()}
                                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                                    >
                                        Disconnect
                                    </button>
                                )}
                            </>
                        ) : (
                            <Button
                                onClick={() => starknetChainData?.connect?.()}
                                disabled={!starknetChainData?.connect}
                                className="w-full"
                            >
                                Connect Starknet
                            </Button>
                        )}
                    </div>
                </div>

                {/* Swap Form */}
                <div className="rounded-md border border-gray-200 p-4 mb-6">
                    <h2 className="text-lg font-mono mb-4">Swap Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-mono text-gray-700 dark:text-gray-300 mb-1">
                                From
                            </label>
                            <div className="font-mono p-2 border rounded bg-gray-50  ">
                                Bitcoin (BTC)
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-mono text-gray-700 dark:text-gray-300 mb-1">
                                To
                            </label>
                            <select
                                className="w-full border rounded-md px-3 py-2 font-mono bg-white  "
                                value={dstToken}
                                onChange={(e) => setDstToken(e.target.value as 'ETH' | 'STRK')}
                            >
                                <option value="ETH">Starknet ETH</option>
                                <option value="STRK">Starknet STRK</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-mono text-gray-700 dark:text-gray-300 mb-1">
                                Amount (BTC)
                            </label>
                            <input
                                type="number"
                                className="w-full border rounded-md px-3 py-2 font-mono bg-white  "
                                value={amountBtc}
                                onChange={(e) => setAmountBtc(e.target.value)}
                                min="0"
                                step="0.00000001"
                                placeholder="0.00003"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs font-mono text-gray-600  ">
                            {connected ? '✓ Wallets connected' : '⚠ Connect wallets to swap'}
                        </div>
                        <Button
                            onClick={handleSwap}
                            disabled={!connected || isInitializing || isSwapping}
                        >
                            {isSwapping ? 'Swapping…' : isInitializing ? 'Initializing…' : 'Swap'}
                        </Button>
                    </div>
                </div>

                {/* Logs */}
                <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-mono mb-2">Transaction Logs</div>
                    <div
                        className={cn(
                            'text-xs font-mono space-y-1 max-h-80 overflow-auto',
                            'bg-gray-50   p-3 rounded'
                        )}
                        aria-live="polite"
                    >
                        {logs.length === 0 ? (
                            <div className="text-gray-500">No logs yet. Start a swap to see transaction details.</div>
                        ) : (
                            logs.map((l, i) => (
                                <div key={i} className="leading-relaxed">
                                    {l}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/store/useWallet';
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
import {request} from 'sats-connect';
import Navbar from '@/components/layout/Navbar';

const factory = new SwapperFactory<[StarknetInitializerType]>([StarknetInitializer]);
const Tokens = factory.Tokens;

export default function SwapPage() {
    const { connected, bitcoinPaymentAddress, bitcoinPublicKeyHex, starknetAddress, selectedBtcWallet, setSelectedBtcWallet, isUniSatAvailable, isXverseAvailable } = useWallet();
    const [starknetRpcUrl, setStarknetRpcUrl] = useState<string>('https://starknet-sepolia.public.blastapi.io/rpc/v0_8');
    const [starknetNetworkName, setStarknetNetworkName] = useState<'SEPOLIA' | 'MAINNET'>('SEPOLIA');
    const [xverseNetwork, setXverseNetwork] = useState<string | null>(null);

    const [amountBtc, setAmountBtc] = useState<string>('0.00003');
    const [dstToken, setDstToken] = useState<'ETH' | 'STRK'>('ETH');
    const [isInitializing, setIsInitializing] = useState<boolean>(false);
    const [isSwapping, setIsSwapping] = useState<boolean>(false);
    const [logs, setLogs] = useState<string[]>([]);

    const btcNetwork = useMemo(() => {
        // Prefer wallet-reported network; fallback to address prefix
        if (xverseNetwork) {
            const n = xverseNetwork.toLowerCase();
            if (n === 'mainnet') return BitcoinNetwork.MAINNET;
            if (n === 'testnet' || n === 'signet' || n === 'test') return BitcoinNetwork.TESTNET4;
        }
        if (!bitcoinPaymentAddress) return BitcoinNetwork.MAINNET;
        return bitcoinPaymentAddress.startsWith('tb1') ? BitcoinNetwork.TESTNET4 : BitcoinNetwork.MAINNET;
    }, [bitcoinPaymentAddress, xverseNetwork]);

    const swapper = useMemo(() => {
        const rpc = new RpcProviderWithRetries({ nodeUrl: starknetRpcUrl });
        return factory.newSwapper({
            chains: { STARKNET: { rpcUrl: rpc } },
            bitcoinNetwork: btcNetwork,
        });
    }, [btcNetwork, starknetRpcUrl]);

    const log = (line: string) => setLogs((l) => [...l, line]);

    const b64ToHex = (b64: string) => {
        const bin = atob(b64);
        let hex = '';
        for (let i = 0; i < bin.length; i++) hex += bin.charCodeAt(i).toString(16).padStart(2, '0');
        return hex;
    };
    const hexToB64 = (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    };

    const signWithUniSat = async (psbtB64: string): Promise<string> => {
        const unisat: any = (window as any).unisat;
        const psbtHex = b64ToHex(psbtB64);
        // Try common signature: signPsbt(psbtHex, options)
        try {
            const res: any = await unisat.signPsbt(psbtHex, { autoFinalized: false });
            if (typeof res === 'string') return res; // hex
            if (res?.psbtHex) return res.psbtHex;
            if (res?.psbt) return b64ToHex(res.psbt);
        } catch (e) {
            // Fallback signature: signPsbt({ psbtHex, autoFinalized })
            const res2: any = await unisat.signPsbt({ psbtHex, autoFinalized: false });
            if (typeof res2 === 'string') return res2;
            if (res2?.psbtHex) return res2.psbtHex;
            if (res2?.psbt) return b64ToHex(res2.psbt);
            throw e;
        }
        throw new Error('UniSat did not return a signed PSBT');
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            // Detect Starknet network from injected wallet if present
            try {
                const anyWindow = window as any;
                const sn = anyWindow?.starknet || anyWindow?.starknet_argentX || anyWindow?.starknet_braavos;
                const chainId = await sn?.provider?.getChainId?.();
                if (btcNetwork === BitcoinNetwork.MAINNET) {
                    if (typeof chainId === 'string') {
                        // SN_MAIN: 0x534e5f4d41494e, SN_SEPOLIA: 0x534e5f5354504c49
                        if (chainId.toLowerCase() === '0x534e5f4d41494e'.toLowerCase()) {
                            setStarknetRpcUrl('https://starknet-mainnet.public.blastapi.io/rpc/v0_8');
                            setStarknetNetworkName('MAINNET');
                        } else if (chainId.toLowerCase() === '0x534e5f5354504c49'.toLowerCase()) {
                            setStarknetRpcUrl('https://starknet-sepolia.public.blastapi.io/rpc/v0_8');
                            setStarknetNetworkName('SEPOLIA');
                        }
                    }
                } else {
                    // For BTC testnet, force Starknet Sepolia regardless of injected network
                    setStarknetRpcUrl('https://starknet-sepolia.public.blastapi.io/rpc/v0_8');
                    setStarknetNetworkName('SEPOLIA');
                }
            } catch {
                // fallback stays on default sepolia
            }

            try {
                const res: any = await request('wallet_getNetwork', null as any);
                if (res?.status === 'success') {
                    const n = (res.result?.type || res.result?.network || '').toString().toLowerCase();
                    setXverseNetwork(n);
                }
            } catch {}
            setIsInitializing(true);
            try {
                await swapper.init();
                if (!cancelled) log('Swapper initialized (BTC: ' + (btcNetwork === BitcoinNetwork.MAINNET ? 'MAINNET' : 'TESTNET') + ', Starknet: ' + starknetNetworkName + (xverseNetwork ? ', Xverse: ' + xverseNetwork : '') + ')');
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
    }, [swapper, btcNetwork, starknetNetworkName]);

    const handleSwap = async () => {
        if (!connected || !bitcoinPaymentAddress || !starknetAddress) {
            alert('Please connect wallet with BTC and Starknet addresses first.');
            return;
        }
        // Block if Xverse network and swapper network disagree
        if (xverseNetwork) {
            const n = xverseNetwork.toLowerCase();
            if (n === 'mainnet' && btcNetwork !== BitcoinNetwork.MAINNET) {
                alert('Network mismatch: Xverse is on mainnet but swapper is using testnet. Switch Xverse to testnet or connect a mainnet BTC address.');
                return;
            }
            if ((n === 'testnet' || n === 'signet' || n === 'test') && btcNetwork !== BitcoinNetwork.TESTNET4) {
                alert('Network mismatch: Xverse is on testnet but swapper is using mainnet. Switch Xverse to mainnet or connect a testnet BTC address.');
                return;
            }
        }
        try {
            setIsSwapping(true);
            const amountInSats = BigInt(Math.floor(Number(amountBtc) * 1e8));

            const token = dstToken === 'ETH' ? Tokens.STARKNET.ETH : Tokens.STARKNET.STRK;

            const swap = await swapper.swap(
                Tokens.BITCOIN.BTC,
                token,
                amountInSats,
                true,
                undefined,
                starknetAddress,
                {}
            );

            log('Swap created ' + swap.getId());
            log('Input (no fee): ' + swap.getInputWithoutFee().toString());
            log('Fees: ' + swap.getFee().amountInSrcToken.toString());
            for (let fee of swap.getFeeBreakdown()) {
                log(' - ' + FeeType[fee.type] + ': ' + fee.fee.amountInSrcToken.toString());
            }
            log('Output: ' + swap.getOutput().toString());

            // In a browser, we request a PSBT to be signed by the connected BTC wallet.
            const funded = await swap.getFundedPsbt({ address: bitcoinPaymentAddress!, publicKey: bitcoinPublicKeyHex! });
            const toB64 = (psbtAny: any) => {
                if (!psbtAny) return '';
                if (typeof psbtAny === 'string') return psbtAny;
                if (typeof psbtAny.toBase64 === 'function') return psbtAny.toBase64();
                return psbtAny.base64 || psbtAny.psbt || '';
            };
            const psbtToSignBase64 = toB64(funded.psbt);
            
            let signedPsbtBase64: string | null = null;
            if (selectedBtcWallet === 'unisat' && typeof (window as any).unisat !== 'undefined') {
                log('Requesting UniSat to sign PSBT...');
                const psbtHexSigned = await signWithUniSat(psbtToSignBase64);
                signedPsbtBase64 = hexToB64(psbtHexSigned);
            } else {
                log('Requesting Xverse to sign PSBT...');
                const signRes = await request('signPsbt', {
                    psbt: psbtToSignBase64,
                    broadcast: false,
                    signInputs: {
                        [bitcoinPaymentAddress!]: funded.signInputs,
                    },
                });
                if (signRes.status !== 'success') {
                    throw new Error(signRes.error?.message || 'Wallet refused to sign PSBT');
                }
                signedPsbtBase64 =
                    (signRes as any).result?.psbt ||
                    (signRes as any).result?.signedPsbt ||
                    (signRes as any).result?.psbtBase64 ||
                    '';
            }

            if (!signedPsbtBase64) throw new Error('Signed PSBT not returned');

            log('Submitting signed PSBT...');
            const txId = await (swap as any).submitPsbt(signedPsbtBase64 as any);
            log('Bitcoin transaction sent: ' + txId);

            await swap.waitForBitcoinTransaction(undefined, 1, () => {});
            log('Bitcoin transaction confirmed. Waiting for claim...');
            try {
                await swap.waitTillClaimedOrFronted(AbortSignal.timeout(30 * 1000));
                log('Successfully claimed by watchtower!');
            } catch (e) {
                log('Auto-claim not detected, attempting manual claim...');
                // Manual claim requires a Starknet signer; for injected wallets, we would call provider.signer
                // For now we rely on watchtower claim path; extend with signer if needed.
            }
        } catch (e: any) {
            log('Swap failed: ' + (e?.message || String(e)));
        } finally {
            setIsSwapping(false);
        }
    };

    return (
        <>
            <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-mono mb-6">Swap</h1>
            {xverseNetwork && (
                <div className="mb-4 text-xs font-mono p-3 border rounded-md">
                    <div>Xverse network: {xverseNetwork}</div>
                    <div>BTC network used: {btcNetwork === BitcoinNetwork.MAINNET ? 'mainnet' : 'testnet4'}</div>
                    <div>Starknet network: {starknetNetworkName.toLowerCase()}</div>
                </div>
            )}
            <div className="grid grid-cols-1 gap-6">
                <div className="rounded-md border border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-mono text-gray-700 mb-1">BTC Wallet</label>
                            <select className="w-full border rounded-md px-3 py-2 font-mono" value={selectedBtcWallet}
                                onChange={(e) => setSelectedBtcWallet(e.target.value as 'xverse' | 'unisat')}
                            >
                                <option value="xverse" disabled={!isXverseAvailable}>Xverse</option>
                                <option value="unisat" disabled={!isUniSatAvailable}>UniSat</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-mono text-gray-700 mb-1">From</label>
                            <div className="font-mono">Bitcoin (BTC)</div>
                        </div>
                        <div>
                            <label className="block text-sm font-mono text-gray-700 mb-1">To</label>
                            <select className="w-full border rounded-md px-3 py-2 font-mono"
                                value={dstToken}
                                onChange={(e) => setDstToken(e.target.value as 'ETH' | 'STRK')}
                            >
                                <option value="ETH">Starknet ETH</option>
                                <option value="STRK">Starknet STRK</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-mono text-gray-700 mb-1">Amount (BTC)</label>
                            <input
                                type="number"
                                className="w-full border rounded-md px-3 py-2 font-mono"
                                value={amountBtc}
                                onChange={(e) => setAmountBtc(e.target.value)}
                                min="0"
                                step="0.00000001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-mono text-gray-700 mb-1">Destination</label>
                            <input
                                className="w-full border rounded-md px-3 py-2 font-mono"
                                value={starknetAddress || ''}
                                readOnly
                                placeholder="Connect wallet to populate"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs font-mono text-gray-600">
                            {connected ? 'Wallet connected' : 'Wallet not connected'}
                        </div>
                        <Button onClick={handleSwap} disabled={!connected || isInitializing || isSwapping}>
                            {isSwapping ? 'Swapping…' : 'Swap'}
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border border-gray-200 p-4">
                    <div className="text-sm font-mono mb-2">Logs</div>
                    <div className={cn('text-xs font-mono space-y-1 max-h-80 overflow-auto')}
                        aria-live="polite"
                    >
                        {logs.length === 0 ? (
                            <div className="text-gray-500">No logs yet.</div>
                        ) : (
                            logs.map((l, i) => (
                                <div key={i}>{l}</div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
        </>

    );
}



"use client";

import { useState, useEffect, useCallback } from "react";
import { Contract, RpcProvider, Account } from "starknet";
import { connect } from "@starknet-io/get-starknet";
import vTokenABI from "@/lib/abi.json";

const STARKNET_RPC_URL = "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";

export interface UseVesuWithdrawResult {
    maxWithdraw: string;
    previewWithdraw: (assets: string) => Promise<string>;
    withdraw: (assets: string, receiver: string, owner: string) => Promise<string>;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook for interacting with Vesu V-Token withdraw functions
 */
export function useVesuWithdraw(
    vTokenAddress: string | null,
    ownerAddress: string | null
): UseVesuWithdrawResult {
    // Helpers for Cairo u256 <-> bigint
    const toUint256 = (value: bigint) => {
        const mask = (1n << 128n) - 1n;
        return { low: `0x${(value & mask).toString(16)}`, high: `0x${(value >> 128n).toString(16)}` } as const;
    };

    const u256ToBigInt = (val: unknown): bigint => {
        // Supports starknet.js responses like { low: string|number|bigint, high: string|number|bigint }
        if (val && typeof val === "object" && "low" in (val as any) && "high" in (val as any)) {
            const lowRaw = (val as any).low as string | number | bigint;
            const highRaw = (val as any).high as string | number | bigint;
            const toBig = (x: string | number | bigint) => BigInt(x.toString());
            const low = toBig(lowRaw);
            const high = toBig(highRaw);
            return (high << 128n) + low;
        }
        // Fallback for plain bigint/string
        try {
            return BigInt((val as any)?.toString?.() ?? val as any);
        } catch {
            return 0n;
        }
    };
    const [maxWithdraw, setMaxWithdraw] = useState<string>("0");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [starknetAccount, setStarknetAccount] = useState<Account | null>(null);

    // Fetch max withdrawable amount
    const fetchMaxWithdraw = useCallback(async () => {
        if (!vTokenAddress || !ownerAddress) {
            setMaxWithdraw("0");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
            const contract = new Contract(vTokenABI, vTokenAddress, provider);

            // Call max_withdraw function (returns u256)
            const result = await contract.max_withdraw(ownerAddress);
            const maxWithdrawValue = u256ToBigInt(result).toString();
            setMaxWithdraw(maxWithdrawValue);
        } catch (err) {
            console.error("Failed to fetch max withdraw:", err);
            setError(
                err instanceof Error ? err : new Error("Failed to fetch max withdraw")
            );
            setMaxWithdraw("0");
        } finally {
            setIsLoading(false);
        }
    }, [vTokenAddress, ownerAddress]);

    // Preview withdraw - returns shares that will be burned
    const previewWithdraw = useCallback(
        async (assets: string): Promise<string> => {
            if (!vTokenAddress) {
                throw new Error("V-Token address not provided");
            }

            try {
                const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
                const contract = new Contract(vTokenABI, vTokenAddress, provider);

                // Call preview_withdraw function (returns u256)
                const result = await contract.preview_withdraw(toUint256(BigInt(assets)));
                return u256ToBigInt(result).toString();
            } catch (err) {
                console.error("Failed to preview withdraw:", err);
                throw err instanceof Error ? err : new Error("Failed to preview withdraw");
            }
        },
        [vTokenAddress]
    );

    // Get Starknet account from wallet
    useEffect(() => {
        const getAccount = async () => {
            try {
                const wallet = await connect({ modalMode: "neverAsk" });
                // Support both get-starknet v3 (wallet.account) and older providers (selected account via accounts array)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const maybeAccount = (wallet as any)?.account || (wallet as any)?.accounts?.[0];
                if (maybeAccount) {
                    setStarknetAccount(maybeAccount as Account);
                }
            } catch (err) {
                console.error("Failed to get Starknet account:", err);
            }
        };

        if (ownerAddress) {
            getAccount();
        }
    }, [ownerAddress]);

    // Execute withdraw
    const withdraw = useCallback(
        async (assets: string, receiver: string, owner: string): Promise<string> => {
            if (!vTokenAddress) {
                throw new Error("V-Token address not provided");
            }

            if (!starknetAccount) {
                throw new Error("Starknet account not connected");
            }

            try {
                setIsLoading(true);
                setError(null);

                // Create contract instance with account for writing
                const contract = new Contract(vTokenABI, vTokenAddress, starknetAccount);

                // Convert assets to Cairo u256
                const assetsU256 = toUint256(BigInt(assets));

                // Call withdraw function
                const result = await contract.withdraw(
                    assetsU256,
                    receiver,
                    owner
                );

                // Wait for transaction
                await starknetAccount.waitForTransaction(result.transaction_hash);

                // Refresh max withdraw after successful transaction
                await fetchMaxWithdraw();

                return result.transaction_hash;
            } catch (err) {
                console.error("Failed to withdraw:", err);
                const error = err instanceof Error ? err : new Error("Failed to withdraw");
                setError(error);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [vTokenAddress, starknetAccount, fetchMaxWithdraw]
    );

    // Fetch max withdraw on mount and when dependencies change
    useEffect(() => {
        fetchMaxWithdraw();
    }, [fetchMaxWithdraw]);

    return {
        maxWithdraw,
        previewWithdraw,
        withdraw,
        isLoading,
        error,
        refetch: fetchMaxWithdraw,
    };
}


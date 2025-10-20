"use client";

import { useState, useEffect, useCallback } from "react";
import { Contract, RpcProvider, Account } from "starknet";
import { connect } from "@starknet-io/get-starknet";
import vTokenABI from "@/lib/abi.json";

const STARKNET_RPC_URL = "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";

export interface UseVesuDepositResult {
    maxDeposit: string;
    previewDeposit: (assets: string) => Promise<string>;
    deposit: (assets: string, receiver: string) => Promise<string>;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook for interacting with Vesu V-Token deposit functions
 */
export function useVesuDeposit(
    vTokenAddress: string | null,
    ownerAddress: string | null
): UseVesuDepositResult {
    const [maxDeposit, setMaxDeposit] = useState<string>("0");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [starknetAccount, setStarknetAccount] = useState<Account | null>(null);

    // Fetch max deposit amount
    const fetchMaxDeposit = useCallback(async () => {
        if (!vTokenAddress || !ownerAddress) {
            setMaxDeposit("0");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
            const contract = new Contract(vTokenABI, vTokenAddress, provider);

            // Call max_deposit function
            const result = await contract.max_deposit(ownerAddress);

            // Convert BigInt to string
            const maxDepositValue = result.toString();
            setMaxDeposit(maxDepositValue);
        } catch (err) {
            console.error("Failed to fetch max deposit:", err);
            setError(
                err instanceof Error ? err : new Error("Failed to fetch max deposit")
            );
            setMaxDeposit("0");
        } finally {
            setIsLoading(false);
        }
    }, [vTokenAddress, ownerAddress]);

    // Preview deposit - returns shares that will be minted
    const previewDeposit = useCallback(
        async (assets: string): Promise<string> => {
            if (!vTokenAddress) {
                throw new Error("V-Token address not provided");
            }

            try {
                const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
                const contract = new Contract(vTokenABI, vTokenAddress, provider);

                // Call preview_deposit function
                const result = await contract.preview_deposit(assets);

                return result.toString();
            } catch (err) {
                console.error("Failed to preview deposit:", err);
                throw err instanceof Error ? err : new Error("Failed to preview deposit");
            }
        },
        [vTokenAddress]
    );

    // Get Starknet account from wallet
    useEffect(() => {
        const getAccount = async () => {
            try {
                const wallet = await connect({ modalMode: "neverAsk" });
                const presentAccount = (wallet as any)?.account || (wallet as any)?.accounts?.[0];
                if (presentAccount) {
                    setStarknetAccount(presentAccount as Account);
                }
            } catch (err) {
                console.error("Failed to get Starknet account:", err);
            }
        };

        if (ownerAddress) {
            getAccount();
        }
    }, [ownerAddress]);

    // Execute deposit
    const deposit = useCallback(
        async (assets: string, receiver: string): Promise<string> => {
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

                // Convert assets string to proper format for contract call
                const assetsValue = BigInt(assets);

                // Before depositing, we need to approve the V-Token contract to spend the underlying asset
                // Get the underlying asset address
                const assetAddress = await contract.asset();

                // Create asset contract instance for approval
                const assetContract = new Contract(vTokenABI, assetAddress, starknetAccount);

                // Approve the V-Token contract to spend assets
                const approveResult = await assetContract.approve(vTokenAddress, assetsValue);
                await starknetAccount.waitForTransaction(approveResult.transaction_hash);

                // Call deposit function
                const result = await contract.deposit(
                    assetsValue,
                    receiver
                );

                // Wait for transaction
                await starknetAccount.waitForTransaction(result.transaction_hash);

                // Refresh max deposit after successful transaction
                await fetchMaxDeposit();

                return result.transaction_hash;
            } catch (err) {
                console.error("Failed to deposit:", err);
                const error = err instanceof Error ? err : new Error("Failed to deposit");
                setError(error);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [vTokenAddress, starknetAccount, fetchMaxDeposit]
    );

    // Fetch max deposit on mount and when dependencies change
    useEffect(() => {
        fetchMaxDeposit();
    }, [fetchMaxDeposit]);

    return {
        maxDeposit,
        previewDeposit,
        deposit,
        isLoading,
        error,
        refetch: fetchMaxDeposit,
    };
}


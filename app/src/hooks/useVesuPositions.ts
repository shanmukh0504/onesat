'use client';

import { useState, useEffect } from 'react';
import { vesuAPI } from '@/lib/api';

export interface UseVesuPositionsResult {
    positions: any;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching Vesu positions for a wallet
 */
export function useVesuPositions(walletAddress: string | null): UseVesuPositionsResult {
    const [positions, setPositions] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchPositions = async () => {
        if (!walletAddress) {
            setPositions(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await vesuAPI.getPositions(walletAddress);
            setPositions(data);
        } catch (err) {
            console.error('Failed to fetch positions:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch positions'));
            setPositions(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
    }, [walletAddress]);

    return {
        positions,
        loading,
        error,
        refetch: fetchPositions,
    };
}



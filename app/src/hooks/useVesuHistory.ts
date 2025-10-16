'use client';

import { useState, useEffect } from 'react';
import { vesuAPI } from '@/lib/api';

export interface UseVesuHistoryResult {
    history: any;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching Vesu transaction history for a wallet
 */
export function useVesuHistory(walletAddress: string | null): UseVesuHistoryResult {
    const [history, setHistory] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchHistory = async () => {
        if (!walletAddress) {
            setHistory(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await vesuAPI.getUserHistory(walletAddress);
            setHistory(data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch history'));
            setHistory(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [walletAddress]);

    return {
        history,
        loading,
        error,
        refetch: fetchHistory,
    };
}



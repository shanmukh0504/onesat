'use client';

import { useState, useEffect } from 'react';
import { vesuAPI } from '@/lib/api';

export interface UseVesuPoolsResult {
    pools: any[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching Vesu pools
 */
export function useVesuPools(): UseVesuPoolsResult {
    const [pools, setPools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchPools = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await vesuAPI.getPools();

            // Handle different response formats
            if (Array.isArray(data)) {
                setPools(data);
            } else if (data && typeof data === 'object') {
                // If the data is an object with pools array
                setPools(data.pools || [data]);
            } else {
                setPools([]);
            }
        } catch (err) {
            console.error('Failed to fetch pools:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch pools'));
            setPools([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPools();
    }, []);

    return {
        pools,
        loading,
        error,
        refetch: fetchPools,
    };
}



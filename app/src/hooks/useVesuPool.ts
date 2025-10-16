'use client';

import { useState, useEffect } from 'react';
import { vesuAPI } from '@/lib/api';

export interface UseVesuPoolResult {
    pool: any;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching a specific Vesu pool by ID
 */
export function useVesuPool(poolId: string | null): UseVesuPoolResult {
    const [pool, setPool] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchPool = async () => {
        if (!poolId) {
            setPool(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await vesuAPI.getPool(poolId);
            setPool(data);
        } catch (err) {
            console.error('Failed to fetch pool:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch pool'));
            setPool(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPool();
    }, [poolId]);

    return {
        pool,
        loading,
        error,
        refetch: fetchPool,
    };
}


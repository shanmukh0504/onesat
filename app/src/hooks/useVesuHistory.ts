"use client";

import { useState, useEffect } from "react";
import { vesuAPI } from "@/lib/api";
import { VesuHistoryResponse } from "@/types/vesu";

export interface UseVesuHistoryResult {
  history: VesuHistoryResponse[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching Vesu transaction history for a wallet
 */
export function useVesuHistory(
  walletAddress: string | null
): UseVesuHistoryResult {
  const [history, setHistory] = useState<VesuHistoryResponse[] | null>(null);
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

      // Handle the new API response format
      if (
        data &&
        data.status === "Ok" &&
        data.result &&
        Array.isArray(data.result)
      ) {
        setHistory(data.result);
      } else if (Array.isArray(data)) {
        setHistory(data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch history")
      );
      setHistory(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
  };
}

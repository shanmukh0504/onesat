/**
 * API Service Layer
 * Handles communication with the OneSat API backend
 */

import { VesuHistoryApiResponse, VesuPositionsApiResponse } from "@/types/vesu";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://fk80wwc88ko88k8c80gg480k.staging.btcfi.wtf";

export interface ApiResponse<T> {
  status: "Ok" | "Error";
  result: T | null;
  error: string | null;
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();

    if (data.status === "Error") {
      throw new Error(data.error || "API request failed");
    }

    return data.result as T;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Vesu API endpoints
 */
export const vesuAPI = {
  /**
   * Get all pools from Vesu
   */
  getPools: async () => {
    return apiFetch<any>("/vesu/pools");
  },

  /**
   * Get specific pool by address
   */
  getPool: async (poolAddress: string) => {
    return apiFetch<any>(`/vesu/pools?poolAddress=${poolAddress}`);
  },

  /**
   * Get positions for a wallet address
   */
  getPositions: async (walletAddress: string) => {
    return apiFetch<VesuPositionsApiResponse>(
      `/vesu/positions?walletAddress=${walletAddress}`
    );
  },

  /**
   * Get user transaction history
   */
  getUserHistory: async (walletAddress: string) => {
    return apiFetch<VesuHistoryApiResponse>(`/deposits/user/${walletAddress}`);
  },
};

/**
 * Asset API endpoints
 */
export const assetAPI = {
  /**
   * Get all supported assets with prices
   */
  getAssets: async () => {
    return apiFetch<any>("/assets");
  },
};

/**
 * Deposit API endpoints
 */
export const depositAPI = {
  /**
   * Create a new deposit
   */
  createDeposit: async (depositData: {
    user_address: string;
    action: number;
    amount: string;
    token: string;
    target_address: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/deposit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(depositData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<any> = await response.json();

    if (data.status === "Error") {
      throw new Error(data.error || "Failed to create deposit");
    }

    return data.result;
  },

  /**
   * Get deposit by ID
   */
  getDeposit: async (depositId: string) => {
    return apiFetch<any>(`/deposit/${depositId}`);
  },

  /**
   * Get all created deposits
   */
  getCreatedDeposits: async () => {
    return apiFetch<any>("/deposits/created");
  },
};

export default {
  vesu: vesuAPI,
  assets: assetAPI,
  deposit: depositAPI,
};

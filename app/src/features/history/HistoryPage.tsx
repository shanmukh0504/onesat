"use client";

import React, { useState, useEffect, useMemo, useContext } from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/store/useWallet";
import { useVesuHistory } from "@/hooks/useVesuHistory";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import HistoryCard from "@/components/history/HistoryCard";
import HistoryCardSkeleton from "@/components/skeletons/HistoryCardSkeleton";
import { DepositStatus } from "@/components/history/DepositStatus";
import { VesuHistoryResponse } from "@/types/vesu";
import { depositAPI } from "@/lib/api";
import { ChainDataContext } from "@/app/context/ChainDataContext";
import { BitcoinNetwork, SwapperFactory } from "@atomiqlabs/sdk";
import { RpcProviderWithRetries, StarknetInitializer, StarknetInitializerType } from "@atomiqlabs/chain-starknet";

interface HistoryPageProps {
  className?: string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ className }) => {
  const { connected, starknetAddress, connect, pendingDeposits, fetchPendingDeposits } = useWallet();
  const chainData = useContext(ChainDataContext);
  const { history, loading: historyLoading } = useVesuHistory(starknetAddress);
  const [selectedDeposit, setSelectedDeposit] = useState<VesuHistoryResponse | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [swapState, setSwapState] = useState<number>(0);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [isSwapperInitialized, setIsSwapperInitialized] = useState(false);
  const [selectedCardStatus, setSelectedCardStatus] = useState<string>("created");

  // Cache BTC tx and confirmation data per deposit ID to avoid repeated API calls
  const [btcDataCache, setBtcDataCache] = useState<Record<string, { txId: string | null; confirmations: number; lastChecked: number }>>({});

  // Initialize Atomiq swapper (SDK) for retrieving swaps by id
  const factory = useMemo(
    () => new SwapperFactory<[StarknetInitializerType]>([StarknetInitializer]),
    []
  );
  const swapper = useMemo(() => {
    const rpc =
      chainData?.STARKNET?.swapperOptions?.rpcUrl ||
      new RpcProviderWithRetries({
        nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
      });
    return factory.newSwapper({
      chains: { STARKNET: { rpcUrl: rpc } },
      bitcoinNetwork: BitcoinNetwork.TESTNET4,
    });
  }, [factory, chainData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await swapper.init();
        if (!cancelled) setIsSwapperInitialized(true);
      } catch { }
    })();
    return () => {
      cancelled = true;
      void swapper.stop();
    };
  }, [swapper]);

  // Keep store's pendingDeposits fresh so we can use it as a fallback
  useEffect(() => {
    if (!starknetAddress) return;
    void fetchPendingDeposits();
    const interval = setInterval(fetchPendingDeposits, 15000);
    return () => clearInterval(interval);
  }, [starknetAddress, fetchPendingDeposits]);

  // Background job: populate BTC data cache for all non-deposited deposits
  useEffect(() => {
    if (!history || history.length === 0 || !isSwapperInitialized) return;

    const getBtcConfirmations = async (txid: string): Promise<number> => {
      try {
        const txResp = await fetch(`/api/mempool/testnet4/api/tx/${txid}`, { cache: "no-store" });
        if (!txResp.ok) return 0;
        const tx = await txResp.json();
        const blockHeight: number | undefined = tx?.status?.block_height;
        if (!blockHeight) return 0;

        const tipResp = await fetch(`/api/mempool/testnet4/api/blocks/tip/height`, { cache: "no-store" });
        if (!tipResp.ok) return 0;
        const tipText = await tipResp.text();
        const tipHeight = Number(tipText);
        if (Number.isNaN(tipHeight)) return 0;

        return Math.max(0, tipHeight - blockHeight + 1);
      } catch {
        return 0;
      }
    };

    const tryFetchSwapBtcTx = async (swapId: string): Promise<string | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const swap: any = await swapper.getSwapById(swapId);
        if (!swap) return null;

        const methodCandidates = [
          "getInputTransactionId",
          "getInputTxId",
          "getSrcTxId",
          "getBitcoinTxId",
        ];
        for (const m of methodCandidates) {
          if (typeof swap[m] === "function") {
            const v = await swap[m]();
            if (typeof v === "string" && /^[a-f0-9]{64}$/i.test(v)) return v;
          }
        }
        return null;
      } catch {
        return null;
      }
    };

    const updateCache = async () => {
      const now = Date.now();
      const CACHE_TTL = 10000; // Only refresh every 10 seconds

      // Fetch tip height once for all confirmations
      let tipHeight: number | null = null;

      for (const deposit of history) {
        // Skip if deposited (no need to poll anymore)
        if (deposit.status === "deposited") continue;

        // Skip if recently checked
        const cached = btcDataCache[deposit.deposit_id];
        if (cached && now - cached.lastChecked < CACHE_TTL) continue;

        // Try to find BTC tx
        let btcTxId: string | null = cached?.txId || null;

        // Check pending deposits store
        if (!btcTxId) {
          const matchingPending = pendingDeposits?.find?.(d => d.depositId === deposit.deposit_id);
          btcTxId = matchingPending?.depositTxHash || null;
        }

        // Check via Atomiq SDK
        if (!btcTxId && deposit.atomiq_swap_id) {
          btcTxId = await tryFetchSwapBtcTx(deposit.atomiq_swap_id);
        }

        // Get confirmations if we have txId
        let confirmations = 0;
        if (btcTxId) {
          try {
            // Fetch tip height only once
            if (tipHeight === null) {
              const tipResp = await fetch(`/api/mempool/testnet4/api/blocks/tip/height`, { cache: "no-store" });
              if (tipResp.ok) {
                const tipText = await tipResp.text();
                tipHeight = Number(tipText);
              }
            }

            if (tipHeight && !Number.isNaN(tipHeight)) {
              const txResp = await fetch(`/api/mempool/testnet4/api/tx/${btcTxId}`, { cache: "no-store" });
              if (txResp.ok) {
                const tx = await txResp.json();
                const blockHeight: number | undefined = tx?.status?.block_height;
                if (blockHeight) {
                  confirmations = Math.max(0, tipHeight - blockHeight + 1);
                }
              }
            }
          } catch {
            // ignore
          }
        }

        // Update cache only if values changed
        const needsUpdate =
          !cached ||
          cached.txId !== btcTxId ||
          cached.confirmations !== confirmations;

        if (needsUpdate) {

          setBtcDataCache(prev => ({
            ...prev,
            [deposit.deposit_id]: {
              txId: btcTxId,
              confirmations,
              lastChecked: now,
            }
          }));
        }
      }
    };

    // Run immediately and every 10 seconds
    updateCache();
    const interval = setInterval(updateCache, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, isSwapperInitialized, pendingDeposits, swapper]);

  // Poll deposit status when a deposit is selected
  useEffect(() => {
    if (!selectedDeposit || !isStatusOpen) return;

    const pollDepositStatus = async () => {
      try {
        const result = await depositAPI.getDeposit(selectedDeposit.deposit_id);

        // Get data from cache
        const cached = btcDataCache[selectedDeposit.deposit_id];
        const btcTxId = cached?.txId || null;
        const confs = cached?.confirmations || 0;

        // Determine status based on backend + cache
        let effectiveStatus = result.status;
        if (result.status === "deposited") {
          effectiveStatus = "deposited";
        } else if (confs >= 2) {
          effectiveStatus = "redeemed";
        } else if (btcTxId) {
          effectiveStatus = "initiated";
        }

        setDepositStatus(effectiveStatus);
        setSelectedCardStatus(effectiveStatus);

        // Update swap state for progress bar
        if (effectiveStatus === "deposited") {
          setSwapState(3);
        } else if (confs >= 2) {
          setSwapState(2);
        } else if (btcTxId) {
          setSwapState(1);
        } else {
          setSwapState(0);
        }
      } catch (e: any) {
        console.error("Failed to fetch deposit status:", e?.message);
      }
    };

    // Poll immediately
    pollDepositStatus();

    // Poll every 5 seconds
    const interval = setInterval(pollDepositStatus, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeposit, isStatusOpen, btcDataCache]);

  const handleCardClick = (deposit: VesuHistoryResponse) => {
    setSelectedDeposit(deposit);
    setDepositStatus(deposit.status);
    setIsStatusOpen(true);

    // Determine the card's effective status from cache (no async calls here!)
    const matchingPending = pendingDeposits?.find?.(
      (d) => d.depositId === deposit.deposit_id
    );
    const cached = btcDataCache[deposit.deposit_id];
    const hasBtcTxInStore = Boolean(matchingPending?.depositTxHash);
    const hasBtcTxInCache = Boolean(cached?.txId);
    const hasBtcTx = hasBtcTxInStore || hasBtcTxInCache;
    const btcConfirmations = cached?.confirmations || 0;
    const hasBtcConfirmations = btcConfirmations >= 2;

    let cardStatus = "created";
    if (deposit.status === "deposited") {
      cardStatus = "deposited";
    } else if (hasBtcConfirmations) {
      cardStatus = "redeemed";
    } else if (hasBtcTx) {
      cardStatus = "initiated";
    } else {
      cardStatus = "created";
    }


    setSelectedCardStatus(cardStatus);

    // Initialize swap state based on deposit data and cache
    if (deposit.status === "deposited") {
      setSwapState(3);
    } else if (hasBtcConfirmations) {
      setSwapState(2);
    } else if (hasBtcTx) {
      setSwapState(1);
    } else {
      setSwapState(0);
    }
  };

  const handleCloseStatus = () => {
    setIsStatusOpen(false);
    setSelectedDeposit(null);
  };

  if (!connected && !historyLoading) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center px-4",
          className
        )}
      >
        <Card className="max-w-lg w-full p-6 xs:p-8 text-center space-y-4 xs:space-y-6">
          <div className="space-y-2">
            <h1 className="font-mono text-3xl font-bold">History</h1>
            <p className="font-mono text-base text-gray-600">
              Connect your wallet to view your transaction history
            </p>
          </div>
          <Button onClick={connect} className="w-full">
            Connect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    if (!history || history.length === 0) {
      return {
        totalDeposits: "0",
        totalValue: "$0.00",
        successRate: "0.00%",
      };
    }

    let totalDeposits = 0;
    let totalValue = 0;
    let successfulDeposits = 0;

    history.forEach((transaction) => {
      totalDeposits++;
      const amount = parseFloat(transaction.amount);
      totalValue += amount;

      if (transaction.status === "deposited") {
        successfulDeposits++;
      }
    });

    const successRate =
      totalDeposits > 0 ? (successfulDeposits / totalDeposits) * 100 : 0;

    return {
      totalDeposits: totalDeposits.toString(),
      totalValue: `$${totalValue.toFixed(2)}`,
      successRate: `${successRate.toFixed(1)}%`,
    };
  };

  const summaryStats = calculateSummaryStats();

  // Helper to compute effective status for a deposit
  const getEffectiveStatus = (deposit: VesuHistoryResponse): string => {
    const cached = btcDataCache[deposit.deposit_id];
    const matchingPending = pendingDeposits?.find?.(d => d.depositId === deposit.deposit_id);
    const hasBtcTx = Boolean(cached?.txId || matchingPending?.depositTxHash);
    const confirmations = cached?.confirmations || 0;

    const effectiveStatus = (() => {
      if (deposit.status === "deposited") return "deposited";
      if (confirmations >= 2) return "redeemed";
      if (hasBtcTx) return "initiated";
      return "created";
    })();


    return effectiveStatus;
  };

  return (
    <div className={cn("min-h-screen py-12 px-4 sm:px-6 lg:px-8", className)}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Summary Stats */}
        <div className="flex w-full flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-6 xs:gap-8 lg:gap-12">
            <h1 className="font-mono flex items-start flex-col text-xl xs:text-2xl sm:text-3xl lg:text-5xl leading-tight text-center sm:text-left">
              <span>History</span>
              <p className="font-mono text-xs xs:text-sm sm:text-md xl:text-lg max-w-md text-center sm:text-right">
                {starknetAddress
                  ? `${starknetAddress.slice(0, 6)}...${starknetAddress.slice(
                    -4
                  )}`
                  : ""}
              </p>
            </h1>

            {/* Summary Statistics */}
            <div className="flex gap-8 w-fit">
              <div className="text-center">
                <div className="font-mono text-2xl font-bold">
                  {summaryStats.totalDeposits}
                </div>
                <div className="font-mono text-sm text-gray-600">
                  Total Deposits
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold">
                  {summaryStats.totalValue}
                </div>
                <div className="font-mono text-sm text-gray-600">
                  Total Value
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold">
                  {summaryStats.successRate}
                </div>
                <div className="font-mono text-sm text-gray-600">
                  Success Rate
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Cards - Stacked Vertically */}
        {historyLoading ? (
          <div className="space-y-3 xs:space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <HistoryCardSkeleton key={index} />
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-3 xs:space-y-4">
            {history.map((transaction, index) => (
              <HistoryCard
                key={index}
                data={transaction}
                onClick={() => handleCardClick(transaction)}
                effectiveStatus={getEffectiveStatus(transaction)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 xs:p-8 text-center">
            <p className="font-mono text-sm xs:text-base text-gray-600">
              No transaction history found.
            </p>
          </Card>
        )}
      </div>

      <DepositStatus
        isOpen={isStatusOpen}
        onClose={handleCloseStatus}
        swapState={swapState}
        depositStatus={selectedCardStatus}
        selectedAsset={selectedDeposit ? { symbol: "Asset" } : null}
        isInitializing={!isSwapperInitialized}
        isSwapping={false}
      />
    </div>
  );
};

export default HistoryPage;

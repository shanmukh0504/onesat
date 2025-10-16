"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/store/useWallet";
import { useVesuHistory } from "@/hooks/useVesuHistory";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import HistoryCard from "@/components/history/HistoryCard";

interface HistoryPageProps {
  className?: string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ className }) => {
  const { connected, starknetAddress, connect } = useWallet();
  const { history, loading: historyLoading } = useVesuHistory(starknetAddress);

  if (!connected) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center px-4",
          className
        )}
      >
        <Card className="max-w-lg w-full p-8 text-center space-y-6">
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
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-8">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-my-grey border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono">Loading...</p>
                </div>
              </Card>
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-4">
            {history.map((transaction, index) => (
              <HistoryCard key={index} data={transaction} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="font-mono text-gray-600">
              No transaction history found.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;

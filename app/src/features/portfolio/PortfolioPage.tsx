"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/store/useWallet";
import { useVesuPositions } from "@/hooks/useVesuPositions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PortfolioCard from "@/components/portfolio/PortfolioCard";
import PortfolioCardSkeleton from "@/components/skeletons/PortfolioCardSkeleton";

interface PortfolioPageProps {
  className?: string;
}

const PortfolioPage: React.FC<PortfolioPageProps> = ({ className }) => {
  const { connected, starknetAddress, connect } = useWallet();
  const { positions, loading: positionsLoading, refetch } =
    useVesuPositions(starknetAddress);

  // Handle successful withdrawal
  const handleWithdrawSuccess = () => {
    // Refetch positions after withdrawal
    refetch();
  };

  // Handle successful modification (deposit or withdraw from modify modal)
  const handleModifySuccess = () => {
    // Refetch positions after modification
    refetch();
  };

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
            <h1 className="font-mono text-3xl font-bold">Portfolio</h1>
            <p className="font-mono text-base text-gray-600">
              Connect your wallet to view your positions and transaction history
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
    if (!positions || positions.length === 0) {
      return {
        totalSupplied: "$0.00",
        totalCollateral: "0.00%",
        totalBorrowed: "0.00%",
      };
    }

    let totalValue = 0;
    positions.forEach((position) => {
      const collateralValue =
        parseFloat(position.collateral.value) /
        Math.pow(10, position.collateral.decimals);
      const priceValue =
        parseFloat(position.collateral.usdPrice.value) /
        Math.pow(10, position.collateral.usdPrice.decimals);
      totalValue += collateralValue * priceValue;
    });

    return {
      totalSupplied: `$${(totalValue / 1000000).toFixed(2)}M`, // Convert to millions
      totalCollateral: "7.52%", // Mock value from image
      totalBorrowed: "81.42%", // Mock value from image
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
              <span>Portfolio</span>
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
                  {summaryStats.totalSupplied}
                </div>
                <div className="font-mono text-sm text-gray-600">
                  Total supplied
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold">
                  {summaryStats.totalCollateral}
                </div>
                <div className="font-mono text-sm text-gray-600">
                  Total Collateral
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold">
                  {summaryStats.totalBorrowed}
                </div>
                <div className="font-mono text-sm text-gray-600">
                  Total borrowed
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Positions Grid */}
        {positionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <PortfolioCardSkeleton key={index} />
            ))}
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.map((position, index) => (
              <PortfolioCard
                key={index}
                data={position}
                onWithdrawSuccess={handleWithdrawSuccess}
                onModifySuccess={handleModifySuccess}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="font-mono text-gray-600">
              No positions found. Start earning by depositing into a pool.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;

"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import MainLayout from "@/components/layout/MainLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CollateralExposure } from "@/components/earn/CollateralExposure";
import { Addresses } from "@/components/earn/Addresses";
import { DepositInput } from "@/components/earn/DepositInput";
import PoolDetailSkeleton from "@/components/earn/PoolDetailSkeleton";
import { useVesuPool } from "@/hooks/useVesuPool";
import {
  getTokenImageUrl,
  formatCurrency,
  formatPercent,
  calculatePoolMetrics
} from "@/lib/earnUtils";

const PoolDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;

  // Fetch pool data from API
  const { pool: apiPool, loading, error } = useVesuPool(poolId);

  // Calculate pool metrics from API data
  let poolMetrics = {
    totalSupplied: "$0.00",
    supplyApr: "0.00%",
    utilization: "0.00%",
    poolName: "Genesis Pool",
    poolIcon: getTokenImageUrl('usdc')
  };

  if (apiPool && apiPool.assets && Array.isArray(apiPool.assets)) {
    // Use utility function to calculate pool metrics
    const { totalTvl, avgSupplyApr, avgUtilization } = calculatePoolMetrics(apiPool);

    // Get first asset for pool icon
    const firstAsset = apiPool.assets && apiPool.assets.length > 0 ? apiPool.assets[0] : null;

    poolMetrics = {
      totalSupplied: formatCurrency(totalTvl),
      supplyApr: formatPercent(avgSupplyApr),
      utilization: formatPercent(avgUtilization),
      poolName: apiPool.name || "Genesis Pool",
      poolIcon: firstAsset ? getTokenImageUrl(firstAsset.symbol) : getTokenImageUrl('usdc')
    };
  }

  const handleBack = () => {
    router.back();
  };

  return !apiPool ? (
    loading ? (
      <MainLayout className="px-4 sm:px-6 lg:px-8">
        <PoolDetailSkeleton />
      </MainLayout>
    ) : (
      <MainLayout className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Pool Not Found</h1>
            <p className="text-gray-600 mb-6">
              The requested pool could not be found.
            </p>
            {error && (
              <p className="text-red-500 text-sm mb-4">
                API Error: {error.message}
              </p>
            )}
            <Button onClick={() => router.back()}>Go Back</Button>
          </Card>
        </div>
      </MainLayout>
    )
  ) : (
    <MainLayout className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full py-6 relative z-10 pb-8 md:pb-12">
        {/* Back Navigation */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Image
              src="/icons/right.svg"
              alt="Back"
              width={16}
              height={16}
              className="w-4 h-4 rotate-180"
            />
            Back to market
          </button>
        </div>

        <div className="mb-6 flex items-center justify-between flex-col md:flex-row gap-8 md:gap-0">
          <div className="flex items-center gap-6 justify-start w-full">
            <Image
              src={poolMetrics.poolIcon}
              alt={poolMetrics.poolName}
              className="w-16 h-16 rounded-full"
              width={64}
              height={64}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/USDCIcon.svg";
              }}
            />
            <div>
              <span className="text-3xl font-medium">{poolMetrics.poolName}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm">Genesis</span>
                <div className="flex items-center">
                  <span className="flex items-center gap-1">
                    <Image
                      src="/vesuIcon.png"
                      alt="Right"
                      width={32}
                      height={32}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Vesu</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center w-full">
            <div className="flex items-center justify-between w-full flex-wrap gap-8">
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-3xl font-medium">{poolMetrics.totalSupplied}</span>
                <span className="text-sm">Total Supplied</span>
              </div>
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-3xl font-medium">{poolMetrics.supplyApr}</span>
                <span className="text-sm">Supply APR</span>
              </div>
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-3xl font-medium">{poolMetrics.utilization}</span>
                <span className="text-sm">Utilization</span>
              </div>
            </div>
          </div>
        </div>

        <DepositInput poolData={apiPool} />

        <hr className="bg-my-grey w-full h-px mt-7" />

        <Addresses poolData={apiPool} />
        <CollateralExposure poolData={apiPool} />
      </div>
    </MainLayout>
  );
};

export default PoolDetailPage;

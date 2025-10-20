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
import PoolDetailSkeleton from "@/components/skeletons/PoolDetailSkeleton";
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
      <MainLayout className="px-3 xs:px-4 sm:px-6 lg:px-8">
        <PoolDetailSkeleton />
      </MainLayout>
    ) : (
      <MainLayout className="px-3 xs:px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full mx-auto px-3 xs:px-4 py-6 xs:py-8">
          <Card className="text-center py-8 xs:py-10 md:py-12">
            <h1 className="text-xl xs:text-2xl font-bold mb-3 xs:mb-4">Pool Not Found</h1>
            <p className="text-sm xs:text-base text-gray-600 mb-4 xs:mb-6">
              The requested pool could not be found.
            </p>
            {error && (
              <p className="text-red-500 text-xs xs:text-sm mb-3 xs:mb-4">
                API Error: {error.message}
              </p>
            )}
            <Button onClick={() => router.back()}>Go Back</Button>
          </Card>
        </div>
      </MainLayout>
    )
  ) : (
    <MainLayout className="px-3 xs:px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full py-4 xs:py-5 md:py-6 relative z-10 pb-6 xs:pb-8 md:pb-12">
        {/* Back Navigation */}
        <div className="mb-4 xs:mb-5 md:mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 xs:gap-2 text-sm xs:text-base text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Image
              src="/icons/right.svg"
              alt="Back"
              width={16}
              height={16}
              className="w-3 h-3 xs:w-4 xs:h-4 rotate-180"
            />
            Back to market
          </button>
        </div>

        <div className="mb-4 xs:mb-5 md:mb-6 flex items-center justify-between flex-col md:flex-row gap-6 xs:gap-7 md:gap-0">
          <div className="flex items-center gap-3 xs:gap-4 md:gap-6 justify-start w-full">
            <Image
              src={poolMetrics.poolIcon}
              alt={poolMetrics.poolName}
              className="w-12 h-12 xs:w-14 xs:h-14 md:w-16 md:h-16 rounded-full"
              width={64}
              height={64}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/USDCIcon.svg";
              }}
            />
            <div>
              <span className="text-xl xs:text-2xl md:text-3xl font-medium">{poolMetrics.poolName}</span>
              <div className="flex items-center gap-2 xs:gap-3">
                <span className="text-xs xs:text-sm">Genesis</span>
                <div className="flex items-center">
                  <span className="flex items-center gap-1">
                    <Image
                      src="/vesuIcon.png"
                      alt="Right"
                      width={32}
                      height={32}
                      className="w-3 h-3 xs:w-4 xs:h-4"
                    />
                    <span className="text-xs xs:text-sm">Vesu</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center w-full">
            <div className="flex items-center justify-between w-full flex-wrap gap-4 xs:gap-6 md:gap-8">
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-lg xs:text-2xl md:text-3xl font-medium">{poolMetrics.totalSupplied}</span>
                <span className="text-xs xs:text-sm">Total Supplied</span>
              </div>
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-lg xs:text-2xl md:text-3xl font-medium">{poolMetrics.supplyApr}</span>
                <span className="text-xs xs:text-sm">Supply APR</span>
              </div>
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-lg xs:text-2xl md:text-3xl font-medium">{poolMetrics.utilization}</span>
                <span className="text-xs xs:text-sm">Utilization</span>
              </div>
            </div>
          </div>
        </div>

        <DepositInput poolData={apiPool} />

        <hr className="bg-my-grey w-full h-px mt-5 xs:mt-6 md:mt-7" />

        <Addresses poolData={apiPool} />
        <CollateralExposure poolData={apiPool} />
      </div>
    </MainLayout>
  );
};

export default PoolDetailPage;

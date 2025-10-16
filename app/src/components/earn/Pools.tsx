"use client";

import { useState } from "react";
import { useVesuPools } from "@/hooks/useVesuPools";
import PoolCard from "./PoolCard";
import PoolCardSkeleton from "./PoolCardSkeleton";
import Pagination from "./Pagination";
import { cn } from "@/lib/utils";
import { PoolCardData, CURRENCIES, PROJECTS } from "@/types/earn";
import Card from "../ui/Card";
import {
  formatCurrency,
  formatPercent,
  calculatePoolMetrics,
  createExposureIcons,
  getOutputCurrency
} from "@/lib/earnUtils";

interface PoolsProps {
  className?: string;
}

const Pools: React.FC<PoolsProps> = ({ className }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { pools, loading, error } = useVesuPools();

  // Transform Vesu API pools to PoolCardData format
  const transformedPools: PoolCardData[] = pools.map((pool: any) => {
    // Extract pool info from the API response
    const poolId = pool.id || `pool-${Math.random()}`;
    const poolName = pool.name || 'Genesis Pool';

    // Calculate pool metrics using utility function
    const { totalTvl, avgSupplyApr, avgUtilization } = calculatePoolMetrics(pool);

    // Create exposure icons and output currency using utility functions
    const exposureIcons = createExposureIcons(pool.assets || []);
    const outputCurrency = getOutputCurrency(pool.assets || []);

    return {
      id: poolId,
      projectIconUrl: PROJECTS.VESU.iconUrl,
      projectName: poolName,
      inputCurrency: CURRENCIES.BITCOIN,
      outputCurrency: outputCurrency,
      totalSupplied: formatCurrency(totalTvl),
      supplyApr: formatPercent(avgSupplyApr),
      utilization: formatPercent(avgUtilization),
      exposureIcons: exposureIcons.length > 0 ? exposureIcons : [],
    };
  });

  const poolsData = transformedPools;

  const totalItems = poolsData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = poolsData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <section
        className={cn(
          "w-full px-3 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8 md:py-12",
          className
        )}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-5">
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <PoolCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={cn(
          "w-full px-3 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8 md:py-12",
          className
        )}
      >
        <div className="max-w-7xl mx-auto">
          <Card className="p-8 text-center">
            <p className="font-mono text-lg text-red-500 mb-4">
              Failed to load pools from API
            </p>
            <p className="font-mono text-sm text-gray-600">
              Error: {error.message}
            </p>
            <p className="font-mono text-sm text-gray-500 mt-2">
              Please try refreshing the page
            </p>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "w-full px-3 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8 md:py-12",
        className
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-5">
          {currentItems.map((poolData) => (
            <PoolCard key={poolData.id} data={poolData} />
          ))}
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </section>
  );
};

export default Pools;

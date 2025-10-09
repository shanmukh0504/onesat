"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import MainLayout from "@/components/layout/MainLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { STATIC_POOL_CARDS } from "@/data/earnData";
import { PoolCardData } from "@/types/earn";
import { CollateralExposure } from "@/components/earn/CollateralExposure";
import { Addresses } from "@/components/earn/Addresses";
import { DepositInput } from "@/components/earn/DepositInput";

const PoolDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const poolId = params.id as string;

  // Find the pool data by ID
  const poolData: PoolCardData | undefined = STATIC_POOL_CARDS.find(
    (pool) => pool.id === poolId
  );

  if (!poolData) {
    return (
      <MainLayout className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Pool Not Found</h1>
            <p className="text-gray-600 mb-6">
              The requested pool could not be found.
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const handleBack = () => {
    router.back();
  };

  return (
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
              src="/USDCIcon.svg"
              alt="USDC"
              className="w-16 h-16 rounded-full"
              width={64}
              height={64}
            />
            <div>
              <span className="text-3xl font-medium">USDC</span>
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
                <span className="text-3xl font-medium">$5.56M</span>
                <span className="text-sm">Total Supplied</span>
              </div>
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-3xl font-medium">7.52%</span>
                <span className="text-sm">Supply APR</span>
              </div>
              <div className="flex flex-col items-center w-fit justify-center">
                <span className="text-3xl font-medium">81.42%</span>
                <span className="text-sm">Utilization</span>
              </div>
            </div>
          </div>
        </div>

        <DepositInput />

        <hr className="bg-my-grey w-full h-px mt-7" />

        <Addresses />
        <CollateralExposure />
      </div>
    </MainLayout>
  );
};

export default PoolDetailPage;

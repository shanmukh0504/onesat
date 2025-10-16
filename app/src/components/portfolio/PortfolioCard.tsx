"use client";

import React from "react";
import Image from "next/image";
import { VesuPositionResponse } from "@/types/vesu";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface PortfolioCardProps {
  data: VesuPositionResponse;
  className?: string;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ data, className }) => {
  // Format collateral value
  const formatValue = (value: string, decimals: number) => {
    const num = parseFloat(value) / Math.pow(10, decimals);
    return num.toFixed(2);
  };

  // Get USD value
  const getUsdValue = (
    value: string,
    usdPrice: { decimals: number; value: string }
  ) => {
    const collateralValue = parseFloat(value) / Math.pow(10, 8); // WBTC has 8 decimals
    const priceValue =
      parseFloat(usdPrice.value) / Math.pow(10, usdPrice.decimals);
    return (collateralValue * priceValue).toFixed(2);
  };

  const collateralAmount = formatValue(
    data.collateral.value,
    data.collateral.decimals
  );
  const collateralUsdValue = getUsdValue(
    data.collateral.value,
    data.collateral.usdPrice
  );

  // Mock values for now - these would come from pool data
  const supplyAPY = "4.742";
  const monthlyYield = "0.95";

  return (
    <Card className={cn("text-left space-y-8 xs:space-y-10", className)}>
      {/* Header */}
      <div className="flex flex-col justify-center xs:flex-row items-center xs:justify-between gap-3 xs:gap-0">
        <div className="flex items-center gap-2 xs:gap-3">
          <div className="w-6 h-6 xs:w-7 xs:h-7 flex items-center justify-center bg-my-grey">
            <Image
              src="https://vesu.xyz/img/curator-logos/vesu-light.png"
              alt="Vesu"
              width={20}
              height={20}
              className="w-4 h-4 xs:w-5 xs:h-5"
            />
          </div>
          <div className="flex items-center gap-1 xs:gap-2">
            <h3 className="font-semibold text-base">Vesu</h3>
            <span className="w-1 h-1 bg-my-grey rounded-full"></span>
            <span className="text-sm">Genesis</span>
          </div>
        </div>

        <div className="flex items-center gap-2 xs:gap-3">
          <div className="flex items-center gap-1">
            <Image
              src="https://garden-finance.imgix.net/token-images/bitcoin.svg"
              alt="Bitcoin"
              width={20}
              height={20}
              className="w-4 h-4 xs:w-5 xs:h-5"
            />
            <div className="text-xs">BTC</div>
          </div>
          <Image
            src="/icons/right.svg"
            alt="Arrow"
            width={16}
            height={16}
            className="w-3 h-3 xs:w-4 xs:h-4"
          />
          <div className="flex items-center gap-1">
            <Image
              src="/USDCIcon.svg"
              alt="USDC"
              width={20}
              height={20}
              className="w-4 h-4 xs:w-5 xs:h-5"
            />
            <div className="text-xs">USDC</div>
          </div>

          <div className="relative">
            <Image
              src="/icons/info.svg"
              alt="Info"
              width={16}
              height={16}
              className="w-3 h-3 xs:w-4 xs:h-4 cursor-help"
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 xs:gap-4 lg:px-4">
        <div className="flex flex-col text-center items-center justify-center">
          <div className="text-sm xs:text-lg font-bold">{supplyAPY}%</div>
          <div className="text-xs">Supply APY</div>
        </div>

        <div className="flex flex-col text-center items-center justify-center">
          <div className="text-sm xs:text-lg font-bold">${monthlyYield}</div>
          <div className="text-xs">Monthly yield</div>
        </div>

        <div className="flex flex-col text-center items-center justify-center">
          <div className="flex items-center justify-center">
            <div className="text-sm xs:text-lg font-bold">
              {collateralAmount}
            </div>
            <Image
              src="/USDCIcon.svg"
              alt="USDC"
              width={16}
              height={16}
              className="w-3 h-3 xs:w-4 xs:h-4 ml-1"
            />
          </div>
          <div className="text-xs">Current value</div>
        </div>

        <div className="flex flex-col text-center items-center justify-center">
          <div className="text-sm xs:text-lg font-bold">
            ${collateralUsdValue}
          </div>
          <div className="text-xs">USD value</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            // Handle modify action
            console.log("Modify position");
          }}
        >
          Modify
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            // Handle withdraw action
            console.log("Withdraw position");
          }}
        >
          Withdraw
        </Button>
      </div>
    </Card>
  );
};

export default PortfolioCard;

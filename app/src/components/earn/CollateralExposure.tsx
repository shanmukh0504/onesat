import Card from "../ui/Card";
import Image from "next/image";
import {
  getTokenImageUrl,
  formatCurrency,
  formatNumber,
  getMaxLTVForAsset,
  getMaxDebtCapForAsset
} from "@/lib/earnUtils";

interface CollateralExposureProps {
  poolData?: any;
}

export const CollateralExposure = ({ poolData }: CollateralExposureProps) => {

  // Get collateral assets from pool data
  const collateralAssets = poolData?.assets || [];

  return (
    <Card className="mt-7 px-0">
      <div className="flex items-center md:justify-between justify-start px-6 flex-wrap gap-4">
        <h4 className="text-lg">Collateral exposure</h4>
        <p className="flex items-center md:w-1/2 md:text-right text-sm">
          Deposits in this market can be borrowed against. Here is a breakdown
          of the collateral exposure.
        </p>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-[160%] sm:w-[120%] md:w-full">
          <thead>
            <tr>
              <th className="text-left py-3 px-6">Collateral</th>
              <th className="text-left py-3 px-6">LTV</th>
              <th className="text-left py-3 px-6">Price</th>
              <th className="text-left py-3 px-6">Debt Cap</th>
            </tr>
          </thead>
          <tbody>
            {collateralAssets.length > 0 ? (
              collateralAssets.map((asset: any, index: number) => {
                // Parse price
                const price = asset.usdPrice
                  ? parseFloat(asset.usdPrice.value || "0") / Math.pow(10, parseInt(asset.usdPrice.decimals || "18"))
                  : 0;

                // Parse total supplied
                const totalSupplied = asset.stats?.totalSupplied
                  ? parseFloat(asset.stats.totalSupplied.value || "0") / Math.pow(10, parseInt(asset.stats.totalSupplied.decimals || "18"))
                  : 0;

                // Get max LTV from pairs data
                const ltv = getMaxLTVForAsset(poolData, asset.address);

                // Get debt cap from pairs data
                const debtCap = getMaxDebtCapForAsset(poolData, asset.address);

                const tokenImageUrl = getTokenImageUrl(asset.symbol || "wbtc");

                return (
                  <tr key={index} className={index % 2 === 1 ? "bg-my-grey/20" : ""}>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <Image
                          src={tokenImageUrl}
                          alt={asset.symbol || "Asset"}
                          width={28}
                          height={28}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/USDCIcon.svg";
                          }}
                        />
                        <span className="text-xl">{asset.symbol || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6">{ltv > 0 ? `${(ltv * 100).toFixed(0)}%` : "N/A"}</td>
                    <td className="py-3 px-6">{price > 0 ? formatCurrency(price) : "N/A"}</td>
                    <td className="py-3 px-6">
                      {debtCap > 0 ? formatNumber(debtCap) : "N/A"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No collateral data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

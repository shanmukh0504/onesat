import Card from "../ui/Card";
import Image from "next/image";

export const CollateralExposure = () => {
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
              <th className="text-left py-3 px-6">Debt cap</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 px-6">
                <div className="flex items-center gap-2">
                  <Image
                    src={"/USDCIcon.svg"}
                    alt="USDC"
                    width={28}
                    height={28}
                  />
                  <span className="text-xl">wstETH</span>
                </div>
              </td>
              <td className="py-3 px-6">90%</td>
              <td className="py-3 px-6">$5.41K</td>
              <td className="py-3">100000000 wstETH</td>
            </tr>
            <tr className="bg-my-grey/20">
              <td className="py-3 px-6">
                <div className="flex items-center gap-2">
                  <Image
                    src={"/USDCIcon.svg"}
                    alt="USDC"
                    width={28}
                    height={28}
                  />
                  <span className="text-xl">wstETH</span>
                </div>
              </td>
              <td className="py-3 px-6">90%</td>
              <td className="py-3 px-6">$5.41K</td>
              <td className="py-3">100000000 wstETH</td>
            </tr>
            <tr>
              <td className="py-3 px-6">
                <div className="flex items-center gap-2">
                  <Image
                    src={"/USDCIcon.svg"}
                    alt="USDC"
                    width={28}
                    height={28}
                  />
                  <span className="text-xl">wstETH</span>
                </div>
              </td>
              <td className="py-3 px-6">90%</td>
              <td className="py-3 px-6">$5.41K</td>
              <td className="py-3">100000000 wstETH</td>
            </tr>
            <tr className="bg-my-grey/20">
              <td className="py-3 px-6">
                <div className="flex items-center gap-2">
                  <Image
                    src={"/USDCIcon.svg"}
                    alt="USDC"
                    width={28}
                    height={28}
                  />
                  <span className="text-xl">wstETH</span>
                </div>
              </td>
              <td className="py-3 px-6">90%</td>
              <td className="py-3 px-6">$5.41K</td>
              <td className="py-3">100000000 wstETH</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

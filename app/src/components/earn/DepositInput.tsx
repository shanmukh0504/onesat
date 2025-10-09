import Card from "../ui/Card";
import Image from "next/image";
import Button from "../ui/Button";

export const DepositInput = () => {
  return (
    <Card
      isActive={false}
      willHover={false}
      className="text-left grid md:grid-cols-3 mt-10 grid-cols-1 gap-8"
    >
      <div className="flex flex-col items-center justify-center gap-2 w-full md:border-r border-b md:border-b-0 pb-9 md:pb-0 border-my-grey md:pr-9">
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <span className="text-lg">I want to deposit</span>
          <div className="flex items-center justify-end gap-1">
            <span className="bg-my-grey text-background text-xs px-2 py-1 rounded-md">
              25%
            </span>
            <span className="bg-my-grey text-background text-xs px-2 py-1 rounded-md">
              50%
            </span>
            <span className="bg-my-grey text-background text-xs px-2 py-1 rounded-md">
              Max
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between w-full border-b border-my-grey pt-4">
          <input
            type="text"
            placeholder="0.0002"
            className="text-[42px] font-medium bg-transparent focus:outline-none active:outline-none w-[70%]"
          />
          <span className="flex items-center gap-2">
            <Image
              src="/BTCIon.svg"
              alt="Info"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <p className="text-2xl">BTC</p>
          </span>
        </div>
        <div className="flex items-center justify-between w-full text-sm font-medium">
          <span>≈ $245.14</span>
          <div className="flex items-center gap-1">
            <span className="font-normal">Balance: </span>
            <span>0.083 BTC</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 w-full md:border-r border-b md:border-b-0 pb-9 md:pb-0 border-my-grey md:pr-9 md:pl-7">
        <div className="flex items-center justify-start w-full">
          <span className="text-lg text-nowrap">Equivalent to</span>
        </div>
        <div className="flex items-center justify-between w-full border-b border-my-grey pt-4">
          <span className="text-[42px] font-medium text-primary">243.5</span>
          <span className="flex items-center gap-2">
            <Image
              src="/USDCIcon.svg"
              alt="Info"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <p className="text-2xl">USDC</p>
          </span>
        </div>
        <div className="flex items-center justify-start w-full text-sm font-medium">
          <div className="flex items-center gap-1">
            <span className="font-normal">Fees: </span>
            <span>$1.94</span>
            <Image
              src="/icons/info.svg"
              alt="Info"
              width={12}
              height={12}
              className="w-3 h-3"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 w-full md:pl-7">
        <div className="flex items-center justify-between w-full">
          <span className="text-lg text-nowrap">Monthly earnings</span>
          <span className="text-lg text-nowrap">$0.03</span>
        </div>
        <div className="flex items-center justify-between w-full">
          <span className="text-lg text-nowrap">Est. 1 yr return</span>
          <span className="text-lg text-nowrap">$0.45</span>
        </div>
        <Button variant="disabled" willHover={false} className="w-full">
          Start Earning
        </Button>
      </div>
    </Card>
  );
};

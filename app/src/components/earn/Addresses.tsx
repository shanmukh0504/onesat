import Card from "../ui/Card";
import Image from "next/image";
import { useState } from "react";

interface AddressesProps {
  poolData?: any;
}

export const Addresses = ({ poolData }: AddressesProps) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Helper function to shorten address
  const shortenAddress = (address: string) => {
    if (!address) return "N/A";
    if (address.length < 12) return address;
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  // Helper function to copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(label);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Extract addresses from pool data
  const ownerAddress = poolData?.owner;
  const poolId = poolData?.id || poolData?.poolId;
  const extensionAddress = poolData?.extensionContractAddress;
  const collateralAsset = poolData?.assets?.[0]?.address;

  return (
    <Card className="mt-7">
      <h4 className="text-lg">Addresses</h4>
      <div className="grid md:grid-cols-4 mt-6 grid-cols-1 gap-6 md:gap-0">
        <div className="flex flex-col items-start justify-start gap-1.5">
          <div className="flex items-center justify-start gap-2 w-full">
            <span className="text-xl font-medium underline-offset-4 underline">
              {shortenAddress(ownerAddress)}
            </span>
            <Image
              src={"/icons/copy.svg"}
              alt="Copy"
              width={16}
              height={16}
              className="pt-0.5 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => copyToClipboard(ownerAddress, "owner")}
              title={copiedAddress === "singleton" ? "Copied!" : "Click to copy"}
            />
          </div>
          <span className="text-sm">Owner</span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1.5">
          <div className="flex items-center justify-start gap-2 w-full">
            <span className="text-xl font-medium underline-offset-4 underline">
              {shortenAddress(poolId)}
            </span>
            <Image
              src={"/icons/copy.svg"}
              alt="Copy"
              width={16}
              height={16}
              className="pt-0.5 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => copyToClipboard(poolId, "poolId")}
              title={copiedAddress === "poolId" ? "Copied!" : "Click to copy"}
            />
          </div>
          <span className="text-sm">Pool Id</span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1.5">
          <div className="flex items-center justify-start gap-2 w-full">
            <span className="text-xl font-medium underline-offset-4 underline">
              {shortenAddress(extensionAddress)}
            </span>
            <Image
              src={"/icons/copy.svg"}
              alt="Copy"
              width={16}
              height={16}
              className="pt-0.5 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => copyToClipboard(extensionAddress, "extension")}
              title={copiedAddress === "extension" ? "Copied!" : "Click to copy"}
            />
          </div>
          <span className="text-sm">Extension</span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1.5">
          <div className="flex items-center justify-start gap-2 w-full">
            <span className="text-xl font-medium underline-offset-4 underline">
              {shortenAddress(collateralAsset)}
            </span>
            <Image
              src={"/icons/copy.svg"}
              alt="Copy"
              width={16}
              height={16}
              className="pt-0.5 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => copyToClipboard(collateralAsset, "collateral")}
              title={copiedAddress === "collateral" ? "Copied!" : "Click to copy"}
            />
          </div>
          <span className="text-sm">Collateral asset</span>
        </div>
      </div>
    </Card>
  );
};

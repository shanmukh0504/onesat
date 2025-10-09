import Card from "../ui/Card";
import Image from "next/image";

export const Addresses = () => {
  return (
    <Card className="mt-7">
      <h4 className="text-lg">Addresses</h4>
      <div className="grid md:grid-cols-4 mt-6 grid-cols-1 gap-6 md:gap-0">
        <div className="flex flex-col items-start justify-start gap-1.5">
          <span className="text-xl font-medium underline-offset-4 underline">
            0x000...0160
          </span>
          <span className="text-sm">Vesu singleton</span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1.5">
          <div className="flex items-center justify-start gap-2 w-full">
            <span className="text-xl font-medium underline-offset-4 underline">
              0x04d...bf28
            </span>
            <Image
              src={"/icons/copy.svg"}
              alt="Copy"
              width={16}
              height={16}
              className="pt-0.5 cursor-pointer"
            />
          </div>
          <span className="text-sm">Pool Id</span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1.5">
          <span className="text-xl font-medium underline-offset-4 underline">
            0x04e...e054
          </span>
          <span className="text-sm">Extension</span>
        </div>
        <div className="flex flex-col items-start justify-start gap-1.5">
          <span className="text-xl font-medium underline-offset-4 underline">
            0x049...4dc7
          </span>
          <span className="text-sm">Collateral asset</span>
        </div>
      </div>
    </Card>
  );
};

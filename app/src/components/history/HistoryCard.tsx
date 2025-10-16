"use client";

import React from "react";
import { VesuHistoryResponse } from "@/types/vesu";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PROJECTS } from "@/types/earn";

interface HistoryCardProps {
  data: VesuHistoryResponse;
  className?: string;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ data, className }) => {
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Format amount with proper decimal places
  const formatAmount = (value: string) => {
    const num = parseFloat(value);

    // If the number is very small, show more decimal places
    if (num < 0.01) {
      return num.toFixed(8);
    } else if (num < 1) {
      return num.toFixed(6);
    } else if (num < 10) {
      return num.toFixed(4);
    } else {
      return num.toFixed(2);
    }
  };

  // Format address to show first 4 and last 4 characters
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Get action type based on action number
  const getActionType = (action: number) => {
    switch (action) {
      case 1:
        return "Deposit";
      case 2:
        return "Withdraw";
      default:
        return "Unknown";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "created":
        return "bg-yellow-500";
      case "initiated":
        return "bg-blue-500";
      case "deposited":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const amount = formatAmount(data.amount);
  const formattedTimestamp = formatTimestamp(data.created_at);
  const actionType = getActionType(data.action);

  return (
    <Card className={cn("space-y-6 w-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 xs:gap-3">
            <div className="w-6 h-6 xs:w-7 xs:h-7 flex items-center justify-center bg-my-grey">
              <Image
                src={PROJECTS.VESU.iconUrl}
                alt={`Vesu`}
                width={20}
                height={20}
                className="w-4 h-4 xs:w-5 xs:h-5"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 xs:gap-2">
            <h3 className="font-semibold text-base">Vesu</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 ${getStatusColor(data.status)} rounded-full`}
          ></div>
          <span className="font-mono text-sm capitalize">{actionType}</span>
        </div>
      </div>

      {/* Transaction Details Grid - 3 cols top row, 4 cols bottom row */}
      <div className="space-y-4">
        {/* Top Row - 3 columns */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="font-mono text-sm font-medium underline">
              {formattedTimestamp}
            </div>
            <div className="font-mono text-xs text-gray-600">Created At</div>
          </div>

          <div className="space-y-1">
            {data.deposit_tx_hash ? (
              <a
                href={`https://starkscan.co/tx/${data.deposit_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm font-medium underline hover:text-blue-600"
              >
                {formatAddress(data.deposit_tx_hash)}
              </a>
            ) : (
              <div className="font-mono text-sm font-medium text-gray-500">
                Pending
              </div>
            )}
            <div className="font-mono text-xs text-gray-600">
              Deposit Tx Hash
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-sm font-medium underline">
              {formatAddress(data.token)}
            </div>
            <div className="font-mono text-xs text-gray-600">Token Address</div>
          </div>
        </div>

        {/* Bottom Row - 4 columns */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="font-mono text-sm font-medium underline">
              {data.atomiq_swap_id ? formatAddress(data.atomiq_swap_id) : "N/A"}
            </div>
            <div className="font-mono text-xs text-gray-600">
              Atomic Swap Id
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-sm font-medium underline">
              {formatAddress(data.target_address)}
            </div>
            <div className="font-mono text-xs text-gray-600">
              Target Address
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-sm font-medium underline">
              {formatAddress(data.deposit_address)}
            </div>
            <div className="font-mono text-xs text-gray-600">
              Deposit Address
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="font-mono text-lg font-medium">{amount}</div>
            <div className="font-mono text-xs text-gray-600">Amount</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HistoryCard;

"use client";

import React from "react";
import { VesuHistoryResponse } from "@/types/vesu";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface HistoryCardProps {
  data: VesuHistoryResponse;
  className?: string;
}

// Helper: explorer URLs
const EXPLORERS = {
  starknet: {
    tx: (hash: string) => `https://sepolia.starkscan.co/tx/${hash}`,
    address: (address: string) => `https://sepolia.starkscan.co/contract/${address}`,
  },
  bitcoin: {
    tx: (hash: string) => `https://blockstream.info/testnet/tx/${hash}`,
    address: (address: string) => `https://blockstream.info/testnet/address/${address}`,
  }
};

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
    if (!address) return "";
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

  // Utility for links and fallback
  const renderLinkedOrRaw = (
    value?: string | null,
    explorer?: (id: string) => string
  ) => {
    if (!value) return <span className="text-gray-500">N/A</span>;
    return explorer ? (
      <a
        href={explorer(value)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-sm font-medium underline hover:text-blue-600"
      >
        {formatAddress(value)}
      </a>
    ) : (
      <span className="font-mono text-sm font-medium">{formatAddress(value)}</span>
    );
  };

  // For Bitcoin addresses vs Starknet addresses
  // Assume: addresses with "bc1", "tb1", or length 42 (0x...) are Bitcoin or Starknet respectively
  const isBitcoinAddress = (addr: string) =>
    addr && (addr.startsWith("tb1") || addr.startsWith("bc1") || /^[13mn]/.test(addr));
  const isStarknetAddress = (addr: string) =>
    addr && addr.startsWith("0x") && addr.length === 66;

  // Detect explorer
  const explorerForAddress = (addr: string) => {
    if (isBitcoinAddress(addr)) return EXPLORERS.bitcoin.address;
    if (isStarknetAddress(addr)) return EXPLORERS.starknet.address;
    return undefined;
  };

  // Detect explorer for tx hash
  // Heuristic: Starknet tx hash start 0x...
  const explorerForTxHash = (hash: string) =>
    hash && hash.startsWith("0x")
      ? EXPLORERS.starknet.tx
      : EXPLORERS.bitcoin.tx;

  const amount = formatAmount(data.amount);
  const formattedTimestamp = formatTimestamp(data.created_at);
  const actionType = getActionType(data.action);

  return (
    <Card className={cn("space-y-6 w-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-full h-full bg-my-grey flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-600 rounded-sm"></div>
            </div>
          </div>
          <span className="font-mono text-sm">Vesu</span>
          <span className="w-1 h-1 bg-my-grey rounded-full"></span>
          <span className="font-mono text-sm">Genesis</span>
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
              renderLinkedOrRaw(
                data.deposit_tx_hash,
                explorerForTxHash(data.deposit_tx_hash)
              )
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
            {renderLinkedOrRaw(
              data.token,
              data.token ? explorerForAddress(data.token) : undefined
            )}
            <div className="font-mono text-xs text-gray-600">Token Address</div>
          </div>
        </div>

        {/* Bottom Row - 4 columns */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            {data.atomiq_swap_id ? (
              renderLinkedOrRaw(
                data.atomiq_swap_id,
                // swap id - usually not an address, no explorer
                undefined
              )
            ) : (
              <span className="text-gray-500">N/A</span>
            )}
            <div className="font-mono text-xs text-gray-600">
              Atomic Swap Id
            </div>
          </div>

          <div className="space-y-1">
            {renderLinkedOrRaw(
              data.target_address,
              data.target_address ? explorerForAddress(data.target_address) : undefined
            )}
            <div className="font-mono text-xs text-gray-600">
              Target Address
            </div>
          </div>

          <div className="space-y-1">
            {renderLinkedOrRaw(
              data.deposit_address,
              data.deposit_address ? explorerForAddress(data.deposit_address) : undefined
            )}
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

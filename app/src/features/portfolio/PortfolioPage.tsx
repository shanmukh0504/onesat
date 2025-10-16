'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useWallet } from '@/store/useWallet';
import { useVesuPositions } from '@/hooks/useVesuPositions';
import { useVesuHistory } from '@/hooks/useVesuHistory';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface PortfolioPageProps {
    className?: string;
}

const PortfolioPage: React.FC<PortfolioPageProps> = ({ className }) => {
    const { connected, starknetAddress, connect } = useWallet();
    const { positions, loading: positionsLoading } = useVesuPositions(starknetAddress);
    const { history, loading: historyLoading } = useVesuHistory(starknetAddress);

    if (!connected) {
        return (
            <div className={cn('min-h-screen flex items-center justify-center px-4', className)}>
                <Card className="max-w-lg w-full p-8 text-center space-y-6">
                    <div className="space-y-2">
                        <h1 className="font-mono text-3xl font-bold">
                            Portfolio
                        </h1>
                        <p className="font-mono text-base text-gray-600">
                            Connect your wallet to view your positions and transaction history
                        </p>
                    </div>
                    <Button onClick={connect} className="w-full">
                        Connect Wallet
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn('min-h-screen py-12 px-4 sm:px-6 lg:px-8', className)}>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="font-mono text-4xl font-bold">
                        Portfolio
                    </h1>
                    <p className="font-mono text-sm text-gray-600">
                        {starknetAddress ? `${starknetAddress.slice(0, 6)}...${starknetAddress.slice(-4)}` : ''}
                    </p>
                </div>

                {/* Positions Section */}
                <div className="space-y-4">
                    <h2 className="font-mono text-2xl font-semibold">
                        Positions
                    </h2>

                    {positionsLoading ? (
                        <Card className="p-8">
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-my-grey border-t-transparent rounded-full animate-spin" />
                                <p className="font-mono">Loading positions...</p>
                            </div>
                        </Card>
                    ) : positions && (Array.isArray(positions) ? positions.length > 0 : Object.keys(positions).length > 0) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(Array.isArray(positions) ? positions : [positions]).map((position: any, index: number) => (
                                <Card key={index} className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-mono font-semibold text-lg">
                                            Position #{index + 1}
                                        </h3>
                                        {position.health_factor && (
                                            <span className="font-mono text-sm px-3 py-1 rounded-full bg-green-100 text-green-800">
                                                Health: {parseFloat(position.health_factor).toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Collateral */}
                                    {position.collateral && Array.isArray(position.collateral) && position.collateral.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="font-mono text-sm font-medium text-gray-600">Collateral</h4>
                                            <div className="space-y-1">
                                                {position.collateral.map((asset: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center font-mono text-sm">
                                                        <span>{asset.symbol || asset.asset_address?.slice(0, 8)}</span>
                                                        <span className="font-semibold">{asset.amount || '0'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Debt */}
                                    {position.debt && Array.isArray(position.debt) && position.debt.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="font-mono text-sm font-medium text-gray-600">Debt</h4>
                                            <div className="space-y-1">
                                                {position.debt.map((asset: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center font-mono text-sm">
                                                        <span>{asset.symbol || asset.asset_address?.slice(0, 8)}</span>
                                                        <span className="font-semibold">{asset.amount || '0'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {position.net_value_usd && (
                                        <div className="pt-3 border-t border-my-grey">
                                            <div className="flex justify-between items-center font-mono">
                                                <span className="text-sm">Net Value</span>
                                                <span className="font-bold text-lg">${parseFloat(position.net_value_usd).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 text-center">
                            <p className="font-mono text-gray-600">
                                No positions found. Start earning by depositing into a pool.
                            </p>
                        </Card>
                    )}
                </div>

                {/* Transaction History Section */}
                <div className="space-y-4">
                    <h2 className="font-mono text-2xl font-semibold">
                        Transaction History
                    </h2>

                    {historyLoading ? (
                        <Card className="p-8">
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-my-grey border-t-transparent rounded-full animate-spin" />
                                <p className="font-mono">Loading history...</p>
                            </div>
                        </Card>
                    ) : history && history.transactions && history.transactions.length > 0 ? (
                        <Card className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-my-grey/10 border-b border-my-grey">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-mono text-sm font-semibold">Type</th>
                                            <th className="px-4 py-3 text-left font-mono text-sm font-semibold">Asset</th>
                                            <th className="px-4 py-3 text-left font-mono text-sm font-semibold">Amount</th>
                                            <th className="px-4 py-3 text-left font-mono text-sm font-semibold">Value</th>
                                            <th className="px-4 py-3 text-left font-mono text-sm font-semibold">Time</th>
                                            <th className="px-4 py-3 text-left font-mono text-sm font-semibold">Tx Hash</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-my-grey/20">
                                        {history.transactions.map((tx: any, index: number) => (
                                            <tr key={index} className="hover:bg-my-grey/5">
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "font-mono text-sm px-2 py-1 rounded",
                                                        tx.type === 'supply' && "bg-green-100 text-green-800",
                                                        tx.type === 'withdraw' && "bg-yellow-100 text-yellow-800",
                                                        tx.type === 'borrow' && "bg-blue-100 text-blue-800",
                                                        tx.type === 'repay' && "bg-purple-100 text-purple-800",
                                                        tx.type === 'liquidate' && "bg-red-100 text-red-800"
                                                    )}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm">
                                                    {tx.asset_symbol || tx.asset_address?.slice(0, 8)}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm font-semibold">
                                                    {tx.amount}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm">
                                                    {tx.value_usd ? `$${parseFloat(tx.value_usd).toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm text-gray-600">
                                                    {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm text-blue-600">
                                                    <a
                                                        href={`https://starkscan.co/tx/${tx.transaction_hash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:underline"
                                                    >
                                                        {tx.transaction_hash?.slice(0, 8)}...
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-8 text-center">
                            <p className="font-mono text-gray-600">
                                No transaction history found.
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PortfolioPage;

"use client";

import { useState, useEffect, useMemo, useContext, useRef } from "react";
import Card from "../ui/Card";
import Image from "next/image";
import Button from "../ui/Button";
import { DepositStatus } from "./DepositStatus";
import {
  BitcoinNetwork,
  SwapperFactory,
} from '@atomiqlabs/sdk';
import {
  RpcProviderWithRetries,
  StarknetInitializer,
  StarknetInitializerType
} from "@atomiqlabs/chain-starknet";
import { ChainDataContext } from "@/app/context/ChainDataContext";
import { useWallet } from "@/store/useWallet";
import { depositAPI, assetAPI } from "@/lib/api";
import { getTokenImageUrl } from "@/lib/earnUtils";

// Patch fetch for CORS
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('mempool.space')) {
      const proxiedUrl = url.replace('https://mempool.space', '/api/mempool');
      return originalFetch(proxiedUrl, init);
    }
    if (url.includes('okx.com')) {
      const proxiedUrl = url.replace('https://www.okx.com', '/api/okx');
      return originalFetch(proxiedUrl, init);
    }
    return originalFetch(input, init);
  };
}

const factory = new SwapperFactory<[StarknetInitializerType]>([StarknetInitializer]);
const Tokens = factory.Tokens;

interface DepositInputProps {
  poolData?: any;
}

interface StoredDepositData {
  swapId: string;
  depositId: string;
  selectedAsset: any;
}

export const DepositInput = ({ poolData }: DepositInputProps) => {
  const chainData = useContext(ChainDataContext);
  const bitcoinChainData = chainData.BITCOIN;
  const starknetChainData = chainData.STARKNET;

  const {
    bitcoinPaymentAddress,
    starknetAddress,
    connected,
  } = useWallet();

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [amountBtc, setAmountBtc] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteAmount, setQuoteAmount] = useState<number>(0);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [btcPrice, setBtcPrice] = useState<number>(50000);
  const [currentDepositId, setCurrentDepositId] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [swapState, setSwapState] = useState<number>(0);
  const [btcBalance, setBtcBalance] = useState<number | null>(null);

  const starknetRpcUrl = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_8';
  const btcNetwork = BitcoinNetwork.TESTNET4;

  // Ref for dropdown click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get collateral assets from pool data
  const collateralAssets = poolData?.assets || [];
  const poolId = poolData?.id || poolData?.poolId;

  // LocalStorage helper functions
  const getStoredDepositKey = (poolId: string) => `onesat_deposit_${poolId}`;

  const getStoredDeposit = (poolId: string): StoredDepositData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(getStoredDepositKey(poolId));
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to get stored deposit:', e);
      return null;
    }
  };

  const setStoredDeposit = (poolId: string, data: StoredDepositData) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getStoredDepositKey(poolId), JSON.stringify(data));
    } catch (e) {
      console.error('Failed to store deposit:', e);
    }
  };

  const removeStoredDeposit = (poolId: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(getStoredDepositKey(poolId));
      console.log('Removed stored deposit from localStorage');
    } catch (e) {
      console.error('Failed to remove stored deposit:', e);
    }
  };

  // Initialize swapper
  const swapper = useMemo(() => {
    const rpc = new RpcProviderWithRetries({ nodeUrl: starknetRpcUrl });
    return factory.newSwapper({
      chains: { STARKNET: { rpcUrl: rpc } },
      bitcoinNetwork: btcNetwork,
    });
  }, [btcNetwork, starknetRpcUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsInitializing(true);
      try {
        await swapper.init();
        if (!cancelled) console.log('Swapper initialized');
      } catch (e: any) {
        if (!cancelled) console.error('Failed to initialize:', e?.message);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
      void swapper.stop();
    };
  }, [swapper]);

  // Fetch BTC price from assets API
  useEffect(() => {
    const fetchBtcPrice = async () => {
      try {
        const assets = await assetAPI.getAssets();
        // Find BTC asset (wrapped-bitcoin or bitcoin)
        const btcAsset = assets.find((asset: any) =>
          asset.coingeckoId === 'bitcoin' ||
          asset.coingeckoId === 'wrapped-bitcoin' ||
          asset.symbol === 'BTC' ||
          asset.symbol === 'WBTC'
        );

        setBtcPrice(btcAsset.price);
      } catch (e: any) {
        console.error('Failed to fetch BTC price:', e?.message);
      }
    };

    fetchBtcPrice();
    // Refresh price every 30 seconds
    const interval = setInterval(fetchBtcPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Set default asset to first one
  useEffect(() => {
    if (collateralAssets.length > 0 && !selectedAsset) {
      setSelectedAsset(collateralAssets[0]);
    }
  }, [collateralAssets]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAssetDropdown(false);
      }
    };

    if (showAssetDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssetDropdown]);

  // Restore from localStorage on mount
  useEffect(() => {
    if (!poolId || isInitializing || collateralAssets.length === 0) return;

    const storedData = getStoredDeposit(poolId);
    if (storedData) {
      console.log('Restoring deposit from localStorage:', storedData);
      setCurrentDepositId(storedData.depositId);

      // Restore selected asset
      const restoredAsset = collateralAssets.find(
        (asset: any) => asset.address === storedData.selectedAsset?.address
      );
      if (restoredAsset) {
        setSelectedAsset(restoredAsset);
      }

      // Try to restore swap state from Atomiq SDK
      (async () => {
        try {
          const swap = await swapper.getSwapById(storedData.swapId);
          if (swap) {
            const state = swap.getState();
            console.log('Restored swap state:', state);
            setSwapState(state);

            // Listen to swap state changes
            swap.events.on('swapState', (updatedSwap) => {
              const newState = updatedSwap.getState();
              console.log('Swap state changed:', newState);
              setSwapState(newState);
            });
          }
        } catch (e) {
          console.error('Failed to restore swap:', e);
        }
      })();
    }
  }, [poolId, isInitializing, collateralAssets, swapper]);

  useEffect(() => {
    const fetchBtcBalance = async () => {
      if (!bitcoinPaymentAddress) return;
  
      try {
        const res = await fetch(`https://mempool.space/testnet4/api/address/${bitcoinPaymentAddress}`);
        const data = await res.json();
        console.log('BTC balance data:', data);
        const balanceInSats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        console.log('BTC balance in sats:', balanceInSats);
        const balanceInBtc = balanceInSats / 1e8;
        setBtcBalance(balanceInBtc);
      } catch (e) {
        console.error("Failed to fetch BTC balance:", e);
        setBtcBalance(null);
      }
    };
  
    fetchBtcBalance();
    const interval = setInterval(fetchBtcBalance, 30000);
    return () => clearInterval(interval);
  }, [bitcoinPaymentAddress]);

  
  // Poll deposit status
  useEffect(() => {
    if (!currentDepositId || depositStatus === 'deposited') {
      return;
    }

    const pollDepositStatus = async () => {
      try {
        const result = await depositAPI.getDeposit(currentDepositId);
        console.log('Deposit status:', result.status);
        setDepositStatus(result.status);

        if (result.status === 'deposited') {
          // Reset when completed
          setCurrentDepositId(null);
          setSwapState(0);

          // Remove from localStorage
          if (poolId) {
            removeStoredDeposit(poolId);
          }
        }
      } catch (e: any) {
        console.error('Failed to fetch deposit status:', e?.message);
      }
    };

    // Poll immediately
    pollDepositStatus();

    // Poll every 5 seconds
    const interval = setInterval(pollDepositStatus, 5000);
    return () => clearInterval(interval);
  }, [currentDepositId, depositStatus, poolId]);

  // Get quote when amount or asset changes
  useEffect(() => {
    // Clear quote if amount is empty or conditions not met
    if (!amountBtc || !selectedAsset || isInitializing || !connected) {
      setQuote(null);
      setIsGettingQuote(false);
      return;
    }

    const getQuote = async () => {
      try {
        setIsGettingQuote(true);
        const amountInSats = BigInt(Math.floor(Number(amountBtc) * 1e8));

        // Map asset symbol to Atomiq token
        let token;
        if (selectedAsset.symbol === 'WBTC') {
          token = Tokens.STARKNET._TESTNET_WBTC_VESU;
        } else if (selectedAsset.symbol === 'STRK') {
          token = Tokens.STARKNET.STRK;
        } else {
          token = Tokens.STARKNET.ETH;
        }

        const quoteData = await swapper.swap(
          Tokens.BITCOIN.BTC,
          token,
          amountInSats,
          true,
          bitcoinPaymentAddress!,
          starknetAddress!,
          {}
        );

        setQuote(quoteData);
        setQuoteAmount(Number(quoteData.getOutput().amount) * (10 ** token.decimals));
      } catch (e: any) {
        console.error('Failed to get quote:', e?.message);
        setQuote(null);
      } finally {
        setIsGettingQuote(false);
      }
    };

    const debounce = setTimeout(getQuote, 500);
    return () => clearTimeout(debounce);
  }, [amountBtc, selectedAsset, isInitializing, connected, bitcoinPaymentAddress, starknetAddress]);

  const handleStartEarning = async () => {
    if (!connected || !bitcoinPaymentAddress || !starknetAddress) {
      alert('Please connect both Bitcoin and Starknet wallets first.');
      return;
    }

    if (!bitcoinChainData?.wallet?.instance) {
      alert('Wallet instances not available. Please reconnect your wallets.');
      return;
    }

    if (!amountBtc || !selectedAsset || !quote) {
      alert('Please enter an amount and wait for the quote.');
      return;
    }

    try {
      setIsSwapping(true);

      const depositResult = await depositAPI.createDeposit({
        user_address: starknetAddress,
        action: 1,
        amount: quoteAmount.toString(),
        token: selectedAsset.address,
        target_address: selectedAsset.vToken.address,
      });

      console.log('✅ Deposit created:', depositResult);

      // Get the deposit address from the response
      let depositAddress = depositResult.deposit_address;
      if (!depositAddress) {
        throw new Error('No deposit_address returned from API');
      }

      // Pad address to 66 characters (0x + 64 hex chars)
      if (depositAddress.startsWith('0x')) {
        const addressWithoutPrefix = depositAddress.slice(2);
        const paddedAddress = addressWithoutPrefix.padStart(64, '0');
        depositAddress = '0x' + paddedAddress;
      }

      console.log('  Deposit ID:', depositResult.deposit_id);
      console.log('  Deposit Address:', depositAddress);

      setCurrentDepositId(depositResult.deposit_id);
      setDepositStatus('created');

      // Step 2: Create swap with deposit_address as destination
      const amountInSats = BigInt(Math.floor(Number(amountBtc) * 1e8));

      // Map asset symbol to Atomiq token
      let token;
      if (selectedAsset.symbol === 'WBTC') {
        token = Tokens.STARKNET._TESTNET_WBTC_VESU;
      } else if (selectedAsset.symbol === 'STRK') {
        token = Tokens.STARKNET.STRK;
      } else {
        token = Tokens.STARKNET.ETH;
      }

      console.log('Creating swap with deposit address...');
      const swap = await swapper.swap(
        Tokens.BITCOIN.BTC,
        token,
        amountInSats,
        true,
        bitcoinPaymentAddress,
        depositAddress, // Use deposit_address from API response
        {}
      );

      const swapId = swap.getId();
      console.log('Swap created:', swapId);

      // Track swap state changes
      swap.events.on('swapState', (updatedSwap) => {
        const state = updatedSwap.getState();
        console.log('Swap state changed:', state);
        setSwapState(state);
      });

      // Patch wallet instance for compatibility
      const btcWallet = bitcoinChainData.wallet?.instance;
      if (btcWallet) {
        if (!(btcWallet as any).publicKey) {
          (btcWallet as any).publicKey = (btcWallet as any).pubkey;
        }
        if (!(btcWallet as any).getAccounts) {
          (btcWallet as any).getAccounts = () =>
            (btcWallet as any).toBitcoinWalletAccounts();
        }
      }

      // Step 3: Send Bitcoin transaction
      const txId = await swap.sendBitcoinTransaction(bitcoinChainData.wallet!.instance);
      console.log('Bitcoin transaction sent: ' + txId);
      
      setIsStatusOpen(true);
      setSwapState(0);
      setDepositStatus(null);

      if (poolId) {
        setStoredDeposit(poolId, {
          swapId: swapId,
          depositId: depositResult.deposit_id,
          selectedAsset: selectedAsset,
        });
        console.log('Saved deposit to localStorage');
      }

      // Step 4: Wait for confirmation with progress updates
      console.log('Waiting for Bitcoin transaction confirmation...');
      await swap.waitForBitcoinTransaction(
        undefined,
        1,
        (txId, confirmations, targetConfirmations, txEtaMs) => {
          if (txId == null) return;
          const etaSeconds = Math.floor(txEtaMs / 1000);
          console.log(`  Transaction ${txId} (${confirmations}/${targetConfirmations}) ETA: ${etaSeconds}s`);
        }
      );
      console.log('✅ Bitcoin transaction confirmed!');
      console.log('✅ Deposit process complete!');

    } catch (e: any) {
      console.error('❌ Deposit failed:', e);
      alert('Deposit failed: ' + (e?.message || String(e)));
    } finally {
      setIsSwapping(false);
    }
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const calculateEquivalent = () => {
    if (!quote || !selectedAsset || !amountBtc) return "0.00";
    const output = Number(quote.getOutput().amount);
    return output.toFixed(5);
  };

  const calculateFees = () => {
    if (!quote) return "$0.00";
    const feeData = quote.getFee();

    // Get fee amount in BTC (using _amount which is the decimal value)
    const feeBtc = feeData.amountInSrcToken._amount;
    const feeUsd = feeBtc * btcPrice;

    return `$${feeUsd.toFixed(2)}`;
  };

  const calculateMonthlyEarnings = () => {
    if (!selectedAsset || !amountBtc) return "$0.00";
    const supplyApr = selectedAsset.stats?.defiSpringSupplyApr?.value || selectedAsset.stats?.supplyApy?.value || "0";
    const aprValue = parseFloat(supplyApr) / Math.pow(10, 18);
    const monthlyRate = aprValue / 12;
    const btcAmount = parseFloat(amountBtc);
    const earnings = btcAmount * btcPrice * monthlyRate;
    return `$${earnings.toFixed(2)}`;
  };

  const calculateYearlyReturn = () => {
    const monthly = parseFloat(calculateMonthlyEarnings().replace('$', ''));
    return `$${(monthly * 12).toFixed(2)}`;
  };

  return (
    <>
      <Card
        isActive={false}
        willHover={false}
        className="text-left grid md:grid-cols-3 mt-10 grid-cols-1 gap-8"
      >
        <div className="flex flex-col items-center justify-center gap-2 w-full md:border-r border-b md:border-b-0 pb-9 md:pb-0 border-my-grey md:pr-9">
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <span className="text-lg">I want to deposit</span>
          </div>
          <div className="flex items-center justify-between w-full border-b border-my-grey pt-4">
            <input
              type="number"
              placeholder="0.0002"
              value={amountBtc}
              onChange={(e) => setAmountBtc(e.target.value)}
              className="text-[32px] lg:text-[36px] font-medium bg-transparent focus:outline-none active:outline-none w-[70%]"
              step="0.00000001"
            />
            <span className="flex items-center gap-2">
              <Image
                src="/BTCIon.svg"
                alt="BTC"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <p className="text-2xl">BTC</p>
            </span>
          </div>
          <div className="flex items-center justify-between w-full text-sm font-medium">
            <span>≈ ${((parseFloat(amountBtc) || 0) * btcPrice).toFixed(2)}</span>
            <div className="flex items-center gap-1">
              <span className="font-normal">Balance: </span>
              <span>{btcBalance !== null ? `${btcBalance.toFixed(3)} BTC` : '--'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 w-full md:border-r border-b md:border-b-0 pb-9 md:pb-0 border-my-grey md:pr-9 md:pl-7">
          <div className="flex items-center justify-start w-full">
            <span className="text-lg text-nowrap">Equivalent to</span>
          </div>
          <div className="flex items-center justify-between w-full border-b border-my-grey pt-4">
            <span className="text-[32px] lg:text-[36px] font-medium text-primary">
              {isGettingQuote ? '...' : calculateEquivalent()}
            </span>
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center gap-2 relative"
                onClick={() => setShowAssetDropdown(!showAssetDropdown)}
              >
                <Image
                  src={selectedAsset ? getTokenImageUrl(selectedAsset.symbol) : getTokenImageUrl('wbtc')}
                  alt={selectedAsset?.symbol || "Asset"}
                  width={32}
                  height={32}
                  className="w-8 h-8"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/USDCIcon.svg";
                  }}
                />
                <div className="flex flex-col items-start">
                  <p className="text-lg font-medium">{selectedAsset?.symbol || 'Select'}</p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showAssetDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAssetDropdown && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {collateralAssets.map((asset: any, index: number) => (
                    <button
                      key={index}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAsset(asset);
                        setShowAssetDropdown(false);
                      }}
                    >
                      <Image
                        src={getTokenImageUrl(asset.symbol) || getTokenImageUrl('wbtc')}
                        alt={asset.symbol}
                        width={24}
                        height={24}
                        className="w-6 h-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/USDCIcon.svg";
                        }}
                      />
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-gray-900">{asset.symbol}</span>
                        <span className="text-xs text-gray-500">{asset.name}</span>
                      </div>
                      {selectedAsset?.symbol === asset.symbol && (
                        <div className="ml-auto">
                          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-start w-full text-sm font-medium">
            <div className="flex items-center gap-1">
              <span className="font-normal">Fees: </span>
              <span>{calculateFees()}</span>
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
            <span className="text-lg text-nowrap">{calculateMonthlyEarnings()}</span>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="text-lg text-nowrap">Est. 1 yr return</span>
            <span className="text-lg text-nowrap">{calculateYearlyReturn()}</span>
          </div>
          <Button
            variant="primary"
            willHover={true}
            className="w-full"
            onClick={() => {
              if (currentDepositId && depositStatus !== 'deposited') {
                setIsStatusOpen(true);
              } else {
                handleStartEarning();
              }
            }}
            disabled={!connected || isInitializing || isSwapping || !amountBtc || !selectedAsset}
          >
            {isSwapping
              ? 'Processing...'
              : isInitializing
                ? 'Initializing...'
                : currentDepositId && depositStatus !== 'deposited'
                  ? 'Order Status'
                  : 'Start Earning'}
          </Button>
        </div>
      </Card>

      {/* Deposit Status Modal */}
      <DepositStatus
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        swapState={swapState}
        depositStatus={depositStatus}
        selectedAsset={selectedAsset}
      />
    </>
  );
};

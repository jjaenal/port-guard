"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Wallet,
  TrendingUp,
  Coins,
  DollarSign,
  Camera,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { useQuery } from "@tanstack/react-query";

import { formatUnits } from "viem";
import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { formatCurrency, formatNumber, formatPercentSigned } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";
import { useLatestSnapshot } from "@/lib/hooks/useLatestSnapshot";
import { useSnapshotHistory } from "@/lib/hooks/useSnapshotHistory";
import { TokenHoldingsTable } from "@/components/ui/token-holdings-table";
import { usePortfolioSeries } from "@/lib/hooks/usePortfolioSeries";
import { PortfolioChart } from "@/components/ui/portfolio-chart";
import { TokenPerformance } from "@/components/ui/token-performance";
import { PortfolioAllocation } from "@/components/ui/portfolio-allocation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { mainnet } from "wagmi/chains";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const {
    eth,
    matic,
    isLoading,
    isFetching: isNativeFetching,
    isError: isNativeError,
    errorMessage: nativeErrorMessage,
    refetch: refetchNative,
  } = useNativeBalances();
  const [overrideAddress, setOverrideAddress] = useState<string>("");
  const publicClient = usePublicClient({ chainId: mainnet.id });

  // Network connectivity
  const [isOnline, setIsOnline] = useState<boolean>(true);
  useEffect(() => {
    const update = () =>
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Debug logging
  console.log("🔍 Dashboard - Wallet status:", {
    address,
    isConnected,
    overrideAddress,
    effectiveAddress: overrideAddress || address,
  });
  const effectiveAddress = overrideAddress || address;

  const {
    tokens,
    isLoading: isTokensLoading,
    isError: isTokensError,
    isFetching: isTokensFetching,
    error: tokensError,
    refetch: refetchTokens,
  } = useTokenHoldings(overrideAddress ? overrideAddress : undefined);
  const {
    data: latestSnapshot,
    isLoading: isSnapshotLoading,
    error: snapshotError,
  } = useLatestSnapshot(address);

  const { data: snapshotHistory, isLoading: isHistoryLoading } =
    useSnapshotHistory(address, 5);

  const pricesQuery = useQuery({
    queryKey: ["api-prices", "eth-matic"],
    queryFn: async () => {
      const response = await fetch(
        "/api/prices?ids=ethereum,matic-network&vs=usd",
      );
      const json = await response.json();
      return json.data || {};
    },
    enabled: isConnected,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes("4")) {
        return false;
      }
      // Retry up to 3 times for network/server errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60_000,
    refetchInterval: 300_000, // Auto-refresh every 5 minutes
    refetchOnWindowFocus: true,
  });
  const {
    data: prices,
    isLoading: isPricesLoading,
    isError: isPricesError,
    isFetching: isPricesFetching,
    refetch: refetchPrices,
  } = pricesQuery;

  const ethAmount = eth ? Number(formatUnits(eth.value, eth.decimals)) : 0;
  const maticAmount = matic
    ? Number(formatUnits(matic.value, matic.decimals))
    : 0;
  const ethUsd = prices?.ethereum?.usd ? ethAmount * prices.ethereum.usd : 0;
  const maticUsd = prices?.["matic-network"]?.usd
    ? maticAmount * prices["matic-network"].usd
    : 0;
  const totalUsd =
    ethUsd +
    maticUsd +
    (tokens?.reduce((acc, t) => acc + (t.valueUsd ?? 0), 0) ?? 0);
  const isPortfolioLoading =
    isLoading ||
    ((isConnected || !!overrideAddress) && isTokensLoading) ||
    (isConnected && isPricesLoading);

  const [rangeDays, setRangeDays] = useState<number>(7);
  const { points: portfolioPoints, isLoading: isSeriesLoading } =
    usePortfolioSeries(
      ethAmount,
      maticAmount,
      tokens,
      isConnected || !!overrideAddress,
      rangeDays,
    );

  // Series khusus 24 jam untuk kalkulasi perubahan keseluruhan portofolio
  const { points: portfolioPoints1d, isLoading: isSeries1dLoading } =
    usePortfolioSeries(
      ethAmount,
      maticAmount,
      tokens,
      isConnected || !!overrideAddress,
      1,
    );

  // Uniswap LP summary
  const {
    data: uniswapData,
    isLoading: isUniswapLoading,
    isError: isUniswapError,
    error: uniswapError,
    refetch: refetchUniswap,
    isFetching: isUniswapFetching,
  } = useQuery({
    queryKey: ["defi-uniswap", overrideAddress || address],
    queryFn: async () => {
      const a = overrideAddress || address;
      if (!a) return { positions: [], totalUsd: 0 };
      const res = await fetch(`/api/defi/uniswap?address=${a}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Uniswap API failed: ${res.status}`);
      }
      const json = await res.json();
      return json.data || { positions: [], totalUsd: 0 };
    },
    enabled: !!(isConnected || !!overrideAddress),
    staleTime: 60_000,
    refetchInterval: 300_000,
    retry: (failureCount, error) => {
      const msg = (error as Error)?.message || "";
      if (/400|not found|invalid/i.test(msg)) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
  const {
    data: aaveData,
    isLoading: isAaveLoading,
    isError: isAaveError,
    error: aaveError,
    refetch: refetchAave,
    isFetching: isAaveFetching,
  } = useQuery({
    queryKey: ["defi-aave", overrideAddress || address],
    queryFn: async () => {
      const a = overrideAddress || address;
      if (!a)
        return {
          chains: [],
          totals: { suppliedCount: 0, borrowedCount: 0 },
        };
      const res = await fetch(
        `/api/defi/aave?address=${a}&chains=ethereum,polygon`,
      );
      const bodyText = await res.text();
      if (!res.ok) {
        let msg = `Aave API failed: ${res.status}`;
        try {
          const parsed = JSON.parse(bodyText);
          msg = parsed?.error || parsed?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      try {
        const json = JSON.parse(bodyText);
        return (
          json?.data || {
            chains: [],
            totals: { suppliedCount: 0, borrowedCount: 0 },
          }
        );
      } catch {
        return {
          chains: [],
          totals: { suppliedCount: 0, borrowedCount: 0 },
        };
      }
    },
    enabled: !!(isConnected || !!overrideAddress),
    staleTime: 60_000,
    refetchInterval: 300_000,
    retry: (failureCount, error) => {
      const msg = (error as Error)?.message || "";
      if (/400|not found|invalid/i.test(msg)) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
  // Lido stETH summary
  const {
    data: lidoData,
    isLoading: isLidoLoading,
    isError: isLidoError,
    error: lidoError,
    // refetch: refetchLido,
    // isFetching: isLidoFetching,
  } = useQuery({
    queryKey: ["defi-lido", effectiveAddress],
    queryFn: async () => {
      const a = effectiveAddress;
      if (!a)
        return {
          chain: "ethereum",
          token: {
            address: "",
            symbol: "stETH",
            name: "Lido Staked Ether",
            decimals: 18,
          },
          balance: "0",
          balanceRaw: "0",
          priceUsd: undefined,
          valueUsd: 0,
          apr: undefined,
          estimatedDailyRewardsUsd: undefined,
        };
      const res = await fetch(`/api/defi/lido?address=${a}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Lido API failed: ${res.status}`);
      }
      const json = await res.json();
      return (
        json?.data || {
          chain: "ethereum",
          token: {
            address: "",
            symbol: "stETH",
            name: "Lido Staked Ether",
            decimals: 18,
          },
          balance: "0",
          balanceRaw: "0",
          priceUsd: undefined,
          valueUsd: 0,
          apr: undefined,
          estimatedDailyRewardsUsd: undefined,
        }
      );
    },
    enabled: !!effectiveAddress,
    staleTime: 60_000,
    refetchInterval: 300_000,
    retry: (failureCount, error) => {
      const msg = (error as Error)?.message || "";
      if (/400|not found|invalid/i.test(msg)) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
  useEffect(() => {
    if (isLidoError && lidoError) {
      const errorMsg = (lidoError as Error)?.message || "";
      if (!/not found|400/i.test(errorMsg)) {
        toast.error("Failed to fetch Lido stETH summary", {
          id: "lido-summary",
        });
      }
    }
  }, [isLidoError, lidoError]);

  // Rocket Pool rETH summary
  const {
    data: rocketPoolData,
    isLoading: isRocketPoolLoading,
    isError: isRocketPoolError,
    error: rocketPoolError,
  } = useQuery({
    queryKey: ["defi-rocket-pool", effectiveAddress],
    queryFn: async () => {
      const a = effectiveAddress;
      if (!a)
        return {
          chain: "ethereum",
          token: {
            address: "",
            symbol: "rETH",
            name: "Rocket Pool ETH",
            decimals: 18,
          },
          balance: "0",
          balanceRaw: "0",
          priceUsd: undefined,
          valueUsd: 0,
          apr: undefined,
          estimatedDailyRewardsUsd: undefined,
        };
      const res = await fetch(`/api/defi/rocket-pool?address=${a}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Rocket Pool API failed: ${res.status}`);
      }
      const json = await res.json();
      return (
        json?.data || {
          chain: "ethereum",
          token: {
            address: "",
            symbol: "rETH",
            name: "Rocket Pool ETH",
            decimals: 18,
          },
          balance: "0",
          balanceRaw: "0",
          priceUsd: undefined,
          valueUsd: 0,
          apr: undefined,
          estimatedDailyRewardsUsd: undefined,
        }
      );
    },
    enabled: !!effectiveAddress,
    staleTime: 60_000,
    refetchInterval: 300_000,
    retry: (failureCount, error) => {
      const msg = (error as Error)?.message || "";
      if (/400|not found|invalid/i.test(msg)) return false;
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
  useEffect(() => {
    if (isRocketPoolError && rocketPoolError) {
      const errorMsg = (rocketPoolError as Error)?.message || "";
      if (!/not found|400/i.test(errorMsg)) {
        toast.error("Failed to fetch Rocket Pool rETH summary", {
          id: "rocket-pool-summary",
        });
      }
    }
  }, [isRocketPoolError, rocketPoolError]);

  const minHealthFactor = useMemo(() => {
    const hfs = (aaveData?.chains || [])
      .map((c: { healthFactor: number | null }) => c.healthFactor)
      .filter((v: number | null): v is number => v != null);
    return hfs.length ? Math.min(...hfs) : null;
  }, [aaveData]);

  const riskLevel = useMemo(() => {
    if (minHealthFactor == null) return "unknown";
    if (minHealthFactor < 1.0) return "liquidation";
    if (minHealthFactor < 1.2) return "high";
    if (minHealthFactor < 1.5) return "medium";
    return "low";
  }, [minHealthFactor]);

  const riskLabel =
    riskLevel === "low"
      ? "Liquidation Risk: Low"
      : riskLevel === "medium"
        ? "Liquidation Risk: Medium"
        : riskLevel === "high"
          ? "Liquidation Risk: High"
          : riskLevel === "liquidation"
            ? "Liquidation Risk: LIQUIDATION"
            : "Liquidation Risk: Unknown";

  const riskClass =
    riskLevel === "low"
      ? "bg-green-100 text-green-700 border border-green-200"
      : riskLevel === "medium"
        ? "bg-amber-100 text-amber-700 border border-amber-200"
        : riskLevel === "high"
          ? "bg-red-100 text-red-700 border border-red-200"
          : riskLevel === "liquidation"
            ? "bg-red-200 text-red-800 border border-red-300 animate-pulse"
            : "bg-gray-100 text-gray-700 border border-gray-200";

  const portfolioChange24hPercent = useMemo(() => {
    if (!portfolioPoints1d || portfolioPoints1d.length < 2) return 0;
    const start = portfolioPoints1d[0].v;
    const end = portfolioPoints1d[portfolioPoints1d.length - 1].v;
    return start > 0 ? ((end - start) / start) * 100 : 0;
  }, [portfolioPoints1d]);

  // Toast notifications for errors
  useEffect(() => {
    if (isPricesError && pricesQuery.error) {
      const errorMsg = (pricesQuery.error as Error)?.message || "";
      if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
        toast.error("Rate limit exceeded. Please wait before refreshing.", {
          id: "prices-rate-limit",
        });
      } else if (errorMsg.includes("fetch")) {
        toast.error("Network error. Check your connection.", {
          id: "prices-network",
        });
      } else {
        toast.error("Failed to fetch price data", {
          id: "prices-general",
        });
      }
    }
  }, [isPricesError, pricesQuery.error]);

  useEffect(() => {
    if (isTokensError && tokensError) {
      const errorMsg = (tokensError as Error)?.message || "";
      if (errorMsg.toLowerCase().includes("network")) {
        toast.error("Network error. Check your connection.", {
          id: "tokens-network",
        });
      } else if (errorMsg.includes("Both chains failed")) {
        toast.error("Unable to connect to blockchain networks", {
          id: "tokens-chains",
        });
      } else if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
        toast.error("Rate limit exceeded for token data", {
          id: "tokens-rate-limit",
        });
      } else {
        toast.error("Failed to fetch token holdings", {
          id: "tokens-general",
        });
      }
    }
  }, [isTokensError, tokensError]);

  useEffect(() => {
    if (isUniswapError && uniswapError) {
      const errorMsg = (uniswapError as Error)?.message || "";
      if (!errorMsg.includes("not found") && !errorMsg.includes("400")) {
        toast.error("Failed to fetch DeFi positions", {
          id: "uniswap-general",
        });
      }
    }
  }, [isUniswapError, uniswapError]);

  useEffect(() => {
    if (isNativeError && nativeErrorMessage) {
      toast.error("Failed to fetch native token balances", {
        id: "native-balances",
      });
    }
  }, [isNativeError, nativeErrorMessage]);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const handleSaveSnapshot = useCallback(async () => {
    if (!address) return;
    try {
      setSaving(true);
      setSaveMsg(null);

      const nativeTokens = [] as Array<{
        chain: "ethereum" | "polygon";
        address: string;
        symbol: string;
        name: string;
        balance: string;
        decimals: number;
        price: number;
        value: number;
      }>;

      if (eth && prices?.ethereum?.usd) {
        nativeTokens.push({
          chain: "ethereum",
          address: "native:eth",
          symbol: "ETH",
          name: "Ethereum",
          balance: String(ethAmount),
          decimals: eth.decimals,
          price: prices.ethereum.usd,
          value: ethUsd,
        });
      }

      if (matic && prices?.["matic-network"]?.usd) {
        nativeTokens.push({
          chain: "polygon",
          address: "native:matic",
          symbol: "MATIC",
          name: "Polygon",
          balance: String(maticAmount),
          decimals: matic.decimals,
          price: prices["matic-network"].usd,
          value: maticUsd,
        });
      }

      const erc20Tokens = tokens.map((t) => ({
        chain: t.chain,
        address: t.contractAddress,
        symbol: t.symbol ?? "",
        name: t.name ?? "",
        balance: t.formatted ?? "0",
        decimals: t.decimals ?? 18,
        price: t.priceUsd ?? 0,
        value: t.valueUsd ?? 0,
      }));

      const payload = { address, tokens: [...nativeTokens, ...erc20Tokens] };
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save snapshot");
      setSaveMsg("Snapshot saved ✓");
      toast.success("Portfolio snapshot saved successfully!", {
        id: "snapshot-success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSaveMsg(`Failed to save snapshot: ${msg}`);
      toast.error(`Failed to save snapshot: ${msg}`, {
        id: "snapshot-error",
      });
    } finally {
      setSaving(false);
    }
  }, [
    address,
    eth,
    matic,
    ethAmount,
    maticAmount,
    ethUsd,
    maticUsd,
    prices,
    tokens,
  ]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* Offline banner */}
      {!isOnline && (
        <Alert className="mb-4">
          <AlertTitle>Offline Mode</AlertTitle>
          <AlertDescription>
            You are currently offline. Data may be stale and actions are
            limited.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Portfolio Dashboard
        </h1>
        <p className="text-muted-foreground">
          {isConnected ? `Wallet: ${address}` : ""}
        </p>
        {isConnected && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground">
                Test with another address (optional)
              </label>
              <Input
                placeholder="0x... wallet address"
                value={overrideAddress}
                onChange={(e) => setOverrideAddress(e.target.value.trim())}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  if (val && val.endsWith(".eth") && publicClient) {
                    try {
                      const resolved = await publicClient.getEnsAddress({
                        name: val,
                      });
                      if (resolved) {
                        setOverrideAddress(resolved);
                        toast.success(`ENS resolved: ${resolved}`);
                      } else {
                        toast.error("ENS name not found");
                      }
                    } catch {
                      toast.error("Failed to resolve ENS");
                    }
                  }
                }}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOverrideAddress(
                      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                    )
                  }
                  className="text-xs"
                >
                  Vitalik
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOverrideAddress(
                      "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
                    )
                  }
                  className="text-xs"
                >
                  Binance Hot Wallet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOverrideAddress(
                      "0x28C6c06298d514Db089934071355E5743bf21d60",
                    )
                  }
                  className="text-xs"
                >
                  Binance 14
                </Button>
                {overrideAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOverrideAddress("")}
                    className="text-xs"
                  >
                    Use my wallet
                  </Button>
                )}
              </div>
              {overrideAddress && (
                <p className="text-xs text-muted-foreground mt-1">
                  Testing address override: {overrideAddress}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {!isConnected && (
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Connect your wallet to view your DeFi portfolio, track your
              investments, and monitor your positions across multiple protocols.
            </p>
            <ConnectButton />

            <div className="mt-8 w-full max-w-md">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Or try with a demo address
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Test Address
                  </label>
                  <Input
                    placeholder="0x... wallet address"
                    value={overrideAddress}
                    onChange={(e) => setOverrideAddress(e.target.value.trim())}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      if (val && val.endsWith(".eth") && publicClient) {
                        try {
                          const resolved = await publicClient.getEnsAddress({
                            name: val,
                          });
                          if (resolved) {
                            setOverrideAddress(resolved);
                            toast.success(`ENS resolved: ${resolved}`);
                          } else {
                            toast.error("ENS name not found");
                          }
                        } catch {
                          toast.error("Failed to resolve ENS");
                        }
                      }
                    }}
                  />
                  {overrideAddress && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Testing with: {overrideAddress}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOverrideAddress(
                        "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                      )
                    }
                    className="text-xs"
                  >
                    Try Vitalik&apos;s Address
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOverrideAddress(
                        "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
                      )
                    }
                    className="text-xs"
                  >
                    Try Binance Hot Wallet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOverrideAddress(
                        "0x28C6c06298d514Db089934071355E5743bf21d60",
                      )
                    }
                    className="text-xs"
                  >
                    Try Binance 14
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(isConnected || !!overrideAddress) && (
        <>
          {(isPricesError || isTokensError || isNativeError) && (
            <div className="mb-4 space-y-2">
              {isPricesError && (
                <Alert
                  variant="destructive"
                  closable
                  autoHide
                  autoHideDuration={15000}
                >
                  <AlertTitle>Price Data Unavailable</AlertTitle>
                  <AlertDescription>
                    {(() => {
                      const errorMsg =
                        (pricesQuery.error as Error)?.message || "";
                      if (errorMsg.includes("fetch")) {
                        return "Network connection issue. Check your internet connection and try again.";
                      }
                      if (
                        errorMsg.includes("429") ||
                        errorMsg.includes("rate limit")
                      ) {
                        return "Rate limit exceeded. Please wait a moment before refreshing.";
                      }
                      if (
                        errorMsg.includes("500") ||
                        errorMsg.includes("server")
                      ) {
                        return "Price service temporarily unavailable. Portfolio values may be outdated.";
                      }
                      return "Unable to fetch current prices. Portfolio values may be outdated.";
                    })()}
                  </AlertDescription>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchPrices()}
                      disabled={isPricesFetching}
                    >
                      {isPricesFetching ? "Retrying..." : "Retry"}
                    </Button>
                  </div>
                </Alert>
              )}
              {isTokensError && (
                <Alert
                  variant="destructive"
                  closable
                  autoHide
                  autoHideDuration={15000}
                >
                  <AlertTitle>Token Holdings Unavailable</AlertTitle>
                  <AlertDescription>
                    {(() => {
                      const errorMsg = (tokensError as Error)?.message || "";
                      if (errorMsg.includes("fetch")) {
                        return "Network connection issue. Check your internet connection and try again.";
                      }
                      if (errorMsg.includes("Both chains failed")) {
                        return "Unable to connect to Ethereum and Polygon networks. Please check your connection.";
                      }
                      if (
                        errorMsg.includes("429") ||
                        errorMsg.includes("rate limit")
                      ) {
                        return "Rate limit exceeded. Please wait a moment before refreshing.";
                      }
                      if (
                        errorMsg.includes("500") ||
                        errorMsg.includes("server")
                      ) {
                        return "Blockchain service temporarily unavailable. Please try again later.";
                      }
                      return (
                        errorMsg ||
                        "Unable to load token holdings. Please try again."
                      );
                    })()}
                  </AlertDescription>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchTokens()}
                      disabled={isTokensFetching}
                    >
                      {isTokensFetching ? "Retrying..." : "Retry"}
                    </Button>
                  </div>
                </Alert>
              )}
              {isNativeError && (
                <Alert
                  variant="destructive"
                  closable
                  autoHide
                  autoHideDuration={15000}
                >
                  <AlertTitle>Wallet Balances Unavailable</AlertTitle>
                  <AlertDescription>
                    {nativeErrorMessage ||
                      "Unable to fetch native balances. Values may be outdated."}
                  </AlertDescription>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchNative()}
                      disabled={isNativeFetching}
                    >
                      {isNativeFetching ? "Retrying..." : "Retry"}
                    </Button>
                  </div>
                </Alert>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            {/* Total Portfolio Value card with 24h change */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Total Portfolio Value
                </CardTitle>
                <CardAction>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                {/* Skeleton saat loading */}
                {isPortfolioLoading || isSeries1dLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-36 bg-muted rounded mb-2" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {isPricesError ? "-" : formatCurrency(totalUsd)}
                    </div>
                    <div
                      className={`text-sm ${portfolioChange24hPercent >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatPercentSigned(portfolioChange24hPercent)} (24h)
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Total Tokens
                </CardTitle>
                <CardAction>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {2 + (tokens?.length ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Mainnet + Polygon
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  ETH 24h Change
                </CardTitle>
                <CardAction>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                {/* Skeleton saat loading */}
                {isPricesLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                ) : (
                  <div className="text-2xl font-bold">
                    <span
                      className={`$${(prices?.ethereum?.usd_24h_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatPercentSigned(
                        prices?.ethereum?.usd_24h_change ?? 0,
                      )}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  vs. previous day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  MATIC 24h Change
                </CardTitle>
                <CardAction>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                {/* Skeleton saat loading */}
                {isPricesLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                ) : (
                  <div className="text-2xl font-bold">
                    <span
                      className={`$${(prices?.["matic-network"]?.usd_24h_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatPercentSigned(
                        prices?.["matic-network"]?.usd_24h_change ?? 0,
                      )}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  vs. previous day
                </p>
              </CardContent>
            </Card>

            {/* Latest Snapshot Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Latest Snapshot
                </CardTitle>
                <CardAction>
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                {isSnapshotLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                ) : snapshotError || !latestSnapshot ? (
                  <>
                    <div className="text-2xl font-bold text-muted-foreground">
                      -
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No snapshot yet
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(latestSnapshot.totalValue)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(latestSnapshot.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Lido stETH Staking Position */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900">
                      <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-sm font-medium">
                      Lido stETH Staking
                    </CardTitle>
                  </div>
                  <CardAction>
                    <Link
                      href={
                        effectiveAddress
                          ? `/defi/lido?address=${effectiveAddress}`
                          : "/defi/lido"
                      }
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Details <ExternalLink className="h-3 w-3" />
                    </Link>
                  </CardAction>
                </div>
              </CardHeader>
              <CardContent>
                {!effectiveAddress || isLidoLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-7 w-28 bg-muted rounded mb-2" />
                    <div className="h-3 w-40 bg-muted rounded" />
                    <div className="h-3 w-36 bg-muted rounded" />
                  </div>
                ) : isLidoError ? (
                  <div className="text-sm text-muted-foreground">
                    No staking positions found
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {typeof lidoData?.valueUsd === "number"
                        ? formatCurrency(lidoData.valueUsd)
                        : "-"}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-xs text-muted-foreground">
                          Balance
                        </div>
                        <div className="font-medium">
                          {typeof lidoData?.balance === "string"
                            ? `${parseFloat(lidoData.balance).toFixed(4)} stETH`
                            : "-"}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-xs text-muted-foreground">APR</div>
                        <div className="font-medium text-green-600">
                          {typeof lidoData?.apr === "number"
                            ? `${lidoData.apr.toFixed(2)}%`
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <div className="text-muted-foreground">
                        Daily Rewards:
                      </div>
                      <div className="font-medium">
                        {typeof lidoData?.estimatedDailyRewardsUsd === "number"
                          ? formatCurrency(lidoData.estimatedDailyRewardsUsd)
                          : "-"}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <div className="text-muted-foreground">Monthly Est:</div>
                      <div className="font-medium">
                        {typeof lidoData?.estimatedDailyRewardsUsd === "number"
                          ? formatCurrency(
                              lidoData.estimatedDailyRewardsUsd * 30,
                            )
                          : "-"}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rocket Pool rETH Staking Position */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-orange-100 p-1.5 dark:bg-orange-900">
                      <Coins className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <CardTitle className="text-sm font-medium">
                      Rocket Pool rETH Staking
                    </CardTitle>
                  </div>
                  <CardAction>
                    <Link
                      href={
                        effectiveAddress
                          ? `/defi/rocket-pool?address=${effectiveAddress}`
                          : "/defi/rocket-pool"
                      }
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Details <ExternalLink className="h-3 w-3" />
                    </Link>
                  </CardAction>
                </div>
              </CardHeader>
              <CardContent>
                {!effectiveAddress || isRocketPoolLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-7 w-28 bg-muted rounded mb-2" />
                    <div className="h-3 w-40 bg-muted rounded" />
                    <div className="h-3 w-36 bg-muted rounded" />
                  </div>
                ) : isRocketPoolError ? (
                  <div className="text-sm text-muted-foreground">
                    No staking positions found
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {typeof rocketPoolData?.valueUsd === "number"
                        ? formatCurrency(rocketPoolData.valueUsd)
                        : "-"}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-xs text-muted-foreground">
                          Balance
                        </div>
                        <div className="font-medium">
                          {typeof rocketPoolData?.balance === "string"
                            ? `${parseFloat(rocketPoolData.balance).toFixed(4)} rETH`
                            : "-"}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-xs text-muted-foreground">APR</div>
                        <div className="font-medium text-green-600">
                          {typeof rocketPoolData?.apr === "number"
                            ? `${rocketPoolData.apr.toFixed(2)}%`
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <div className="text-muted-foreground">
                        Daily Rewards:
                      </div>
                      <div className="font-medium">
                        {typeof rocketPoolData?.estimatedDailyRewardsUsd ===
                        "number"
                          ? formatCurrency(
                              rocketPoolData.estimatedDailyRewardsUsd,
                            )
                          : "-"}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <div className="text-muted-foreground">Monthly Est:</div>
                      <div className="font-medium">
                        {typeof rocketPoolData?.estimatedDailyRewardsUsd ===
                        "number"
                          ? formatCurrency(
                              rocketPoolData.estimatedDailyRewardsUsd * 30,
                            )
                          : "-"}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Claimable Rewards */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-emerald-100 p-1.5 dark:bg-emerald-900">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <CardTitle className="text-sm font-medium">
                      Claimable Rewards (Estimate)
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!effectiveAddress ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-7 w-28 bg-muted rounded mb-2" />
                    <div className="h-3 w-40 bg-muted rounded" />
                    <div className="h-3 w-36 bg-muted rounded" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        (lidoData?.estimatedDailyRewardsUsd ?? 0) +
                          (rocketPoolData?.estimatedDailyRewardsUsd ?? 0) || 0,
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-xs text-muted-foreground">
                          Daily Total
                        </div>
                        <div className="font-medium">
                          {formatCurrency(
                            (lidoData?.estimatedDailyRewardsUsd ?? 0) +
                              (rocketPoolData?.estimatedDailyRewardsUsd ?? 0),
                          )}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <div className="text-xs text-muted-foreground">
                          Monthly Est
                        </div>
                        <div className="font-medium">
                          {formatCurrency(
                            ((lidoData?.estimatedDailyRewardsUsd ?? 0) +
                              (rocketPoolData?.estimatedDailyRewardsUsd ?? 0)) *
                              30,
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Lido (Auto-compounding)
                        </span>
                        <span className="font-medium">
                          {typeof lidoData?.estimatedDailyRewardsUsd ===
                          "number"
                            ? formatCurrency(lidoData.estimatedDailyRewardsUsd)
                            : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Rocket Pool (Auto-compounding)
                        </span>
                        <span className="font-medium">
                          {typeof rocketPoolData?.estimatedDailyRewardsUsd ===
                          "number"
                            ? formatCurrency(
                                rocketPoolData.estimatedDailyRewardsUsd,
                              )
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Uniswap V3 Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Uniswap V3
                </CardTitle>
                <CardAction>
                  <Link
                    href={
                      effectiveAddress
                        ? `/defi/uniswap?address=${effectiveAddress}`
                        : "/defi/uniswap"
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {!effectiveAddress || isUniswapLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-28 bg-muted rounded mb-2" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                ) : isUniswapError ? (
                  <div className="text-sm text-muted-foreground">-</div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {typeof uniswapData?.totalUsd === "number"
                        ? formatCurrency(uniswapData.totalUsd)
                        : "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg APR (7d):{" "}
                      {typeof uniswapData?.avgApr7d === "number"
                        ? `${uniswapData.avgApr7d.toFixed(2)}%`
                        : "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Positions:{" "}
                      {Array.isArray(uniswapData?.positions)
                        ? uniswapData!.positions.length
                        : 0}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <Button
              onClick={handleSaveSnapshot}
              disabled={!isConnected || saving || isPortfolioLoading}
            >
              {saving ? "Saving…" : "Save Snapshot"}
            </Button>
            {saveMsg && (
              <span className="text-sm text-muted-foreground">{saveMsg}</span>
            )}
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance ({rangeDays}d)</CardTitle>
                <CardDescription>
                  Value based on ETH, MATIC & top ERC-20
                </CardDescription>
                <CardAction>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Button
                      variant={rangeDays === 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRangeDays(1)}
                    >
                      1d
                    </Button>
                    <Button
                      variant={rangeDays === 7 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRangeDays(7)}
                    >
                      7d
                    </Button>
                    <Button
                      variant={rangeDays === 30 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRangeDays(30)}
                    >
                      30d
                    </Button>
                    <Button
                      variant={rangeDays === 90 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRangeDays(90)}
                    >
                      90d
                    </Button>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                {isSeriesLoading ? (
                  <div className="animate-pulse h-[200px] w-full bg-muted rounded" />
                ) : (
                  <PortfolioChart points={portfolioPoints} height={200} />
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-background">
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Image
                      src="https://cryptologos.cc/logos/aave-aave-logo.svg?v=029"
                      alt="Aave"
                      width={20}
                      height={20}
                      loading="lazy"
                    />
                    <span>Aave v3 Positions</span>
                  </span>
                </CardTitle>
                <CardDescription>
                  Health factor and position counts on ETH & Polygon
                </CardDescription>
                <CardAction>
                  <div className="flex items-center gap-2">
                    {isAaveFetching && (
                      <span className="text-xs text-muted-foreground">
                        Refreshing…
                      </span>
                    )}
                  </div>
                  {!isAaveLoading && !isAaveError && (
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${riskClass}`}
                        title="Risk levels: Low ≥ 1.5, Medium ≥ 1.2, High ≥ 1.0, Liquidation < 1.0"
                      >
                        {riskLabel}
                      </span>
                      {minHealthFactor != null && (
                        <span className="text-xs text-muted-foreground">
                          HF min: {minHealthFactor.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent>
                {isAaveLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 w-64 bg-muted rounded" />
                    <div className="h-6 w-64 bg-muted rounded" />
                  </div>
                ) : isAaveError ? (
                  <Alert
                    variant="destructive"
                    closable
                    autoHide
                    autoHideDuration={15000}
                  >
                    <AlertTitle>Aave Positions Unavailable</AlertTitle>
                    <AlertDescription>
                      {(() => {
                        const msg = (aaveError as Error)?.message || "";
                        if (/fetch|network/i.test(msg))
                          return "Network issue. Check your connection and retry.";
                        if (/429|rate limit/i.test(msg))
                          return "Rate limit exceeded. Please wait before refreshing.";
                        if (/500|server/i.test(msg))
                          return "Service temporarily unavailable. Try again later.";
                        return (
                          msg || "Unable to load positions. Please try again."
                        );
                      })()}
                    </AlertDescription>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchAave()}
                        disabled={isAaveFetching}
                      >
                        {isAaveFetching ? "Retrying..." : "Retry"}
                      </Button>
                    </div>
                  </Alert>
                ) : (
                  <>
                    {minHealthFactor != null && minHealthFactor < 1.2 && (
                      <Alert
                        variant="destructive"
                        closable
                        autoHide
                        autoHideDuration={15000}
                      >
                        <AlertTitle>
                          Health Factor is low ({minHealthFactor.toFixed(2)})
                        </AlertTitle>
                        <AlertDescription>
                          Consider repaying debt or adding collateral to reduce
                          liquidation risk.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Supplied Positions (total)
                        </p>
                        <p className="font-medium">
                          {aaveData?.totals?.suppliedCount ?? 0}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Borrowed Positions (total)
                        </p>
                        <p className="font-medium">
                          {aaveData?.totals?.borrowedCount ?? 0}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {aaveData?.chains?.map(
                          (c: {
                            chain: "ethereum" | "polygon";
                            suppliedCount: number;
                            borrowedCount: number;
                            healthFactor: number | null;
                            supplyApyMin?: number | null;
                            supplyApyMax?: number | null;
                            borrowApyMin?: number | null;
                            borrowApyMax?: number | null;
                          }) => (
                            <div key={c.chain} className="border rounded p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground capitalize">
                                  {c.chain}
                                </p>
                                <p
                                  className={`text-sm ${
                                    (c.healthFactor ?? 0) >= 1.5
                                      ? "text-green-600"
                                      : (c.healthFactor ?? 0) >= 1.0
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  HF:{" "}
                                  {c.healthFactor != null
                                    ? c.healthFactor.toFixed(2)
                                    : "-"}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  Supplied
                                </p>
                                <p className="text-xs font-medium">
                                  {c.suppliedCount}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  Borrowed
                                </p>
                                <p className="text-xs font-medium">
                                  {c.borrowedCount}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  Supply APY (range)
                                </p>
                                <p className="text-xs font-medium">
                                  {c.supplyApyMin != null &&
                                  c.supplyApyMax != null
                                    ? `${c.supplyApyMin.toFixed(2)}–${c.supplyApyMax.toFixed(2)}%`
                                    : "-"}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  Borrow APY (range)
                                </p>
                                <p className="text-xs font-medium">
                                  {c.borrowApyMin != null &&
                                  c.borrowApyMax != null
                                    ? `${c.borrowApyMin.toFixed(2)}–${c.borrowApyMax.toFixed(2)}%`
                                    : "-"}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Image
                      src="https://cryptologos.cc/logos/uniswap-uni-logo.svg?v=029"
                      alt="Uniswap"
                      width={20}
                      height={20}
                      loading="lazy"
                    />
                    <span>Uniswap v3 LPs</span>
                  </span>
                </CardTitle>
                <CardDescription>
                  LP positions & estimated value
                </CardDescription>
                <CardAction>
                  <div className="flex items-center gap-2">
                    {isUniswapFetching && (
                      <span className="text-xs text-muted-foreground">
                        Refreshing…
                      </span>
                    )}
                    <Link
                      href={`/defi/uniswap?address=${overrideAddress || address || ""}`}
                      className="ml-auto"
                    >
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </Link>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                {isUniswapLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 w-64 bg-muted rounded" />
                    <div className="h-6 w-64 bg-muted rounded" />
                  </div>
                ) : isUniswapError ? (
                  <Alert
                    variant="destructive"
                    closable
                    autoHide
                    autoHideDuration={15000}
                  >
                    <AlertTitle>Uniswap Positions Unavailable</AlertTitle>
                    <AlertDescription>
                      {(() => {
                        const msg = (uniswapError as Error)?.message || "";
                        if (/fetch|network/i.test(msg))
                          return "Network issue. Check your connection and retry.";
                        if (/429|rate limit/i.test(msg))
                          return "Rate limit exceeded. Please wait before refreshing.";
                        if (/500|server/i.test(msg))
                          return "Service temporarily unavailable. Try again later.";
                        if (/invalid ethereum address/i.test(msg))
                          return "Invalid Ethereum address format.";
                        return (
                          msg || "Unable to load positions. Please try again."
                        );
                      })()}
                    </AlertDescription>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchUniswap()}
                        disabled={isUniswapFetching}
                      >
                        {isUniswapFetching ? "Retrying..." : "Retry"}
                      </Button>
                    </div>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Positions (total)
                      </p>
                      <p className="font-medium">
                        {uniswapData?.positions?.length ?? 0}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Estimated Total Value
                      </p>
                      <p className="font-medium">
                        {formatCurrency(uniswapData?.totalUsd ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Token Holdings</CardTitle>
                <CardDescription>
                  Your current token balances and values
                </CardDescription>
                <CardAction>
                  {(isPricesFetching || isLoading || isNativeFetching) && (
                    <span className="text-xs text-muted-foreground">
                      Refreshing…
                    </span>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent>
                {isPortfolioLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-6 w-64 bg-muted rounded" />
                    <div className="h-6 w-64 bg-muted rounded" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          ETH
                        </div>
                        <div>
                          <p className="font-medium">Ethereum</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(ethAmount, {
                              maximumFractionDigits: 6,
                            })}{" "}
                            ETH
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {isPricesError ? "-" : `$${ethUsd.toFixed(2)}`}
                        </p>
                        <p
                          className={`text-sm ${(prices?.ethereum?.usd_24h_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatPercentSigned(
                            prices?.ethereum?.usd_24h_change ?? 0,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          MATIC
                        </div>
                        <div>
                          <p className="font-medium">Polygon</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(maticAmount, {
                              maximumFractionDigits: 6,
                            })}{" "}
                            MATIC
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {isPricesError ? "-" : `$${maticUsd.toFixed(2)}`}
                        </p>
                        <p
                          className={`text-sm ${(prices?.["matic-network"]?.usd_24h_change ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatPercentSigned(
                            prices?.["matic-network"]?.usd_24h_change ?? 0,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ERC-20 Token Holdings</CardTitle>
                <CardDescription>
                  Your ERC-20 balances and USD values
                </CardDescription>
                <CardAction>
                  {isTokensFetching && (
                    <span className="text-xs text-muted-foreground">
                      Refreshing…
                    </span>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent>
                {isTokensLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 w-64 bg-muted rounded" />
                    <div className="h-6 w-64 bg-muted rounded" />
                  </div>
                ) : isTokensError ? (
                  <p className="text-destructive">
                    Failed to load token holdings
                    {typeof tokensError?.message === "string"
                      ? `: ${tokensError.message}`
                      : "."}
                  </p>
                ) : tokens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Coins className="h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-1">
                      No ERC-20 tokens detected
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      We didn’t find any ERC-20 balances for this address. If
                      you just funded it, try refreshing. You can also test with
                      a known demo address to see how the table looks.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchTokens()}
                      >
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setOverrideAddress(
                            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                          )
                        }
                      >
                        Try Vitalik&apos;s Address
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Tip: Add some tokens to your wallet to populate holdings.
                    </p>
                  </div>
                ) : (
                  <TokenHoldingsTable tokens={tokens} />
                )}
              </CardContent>
            </Card>

            {/* Token Performance Analytics */}
            {tokens.length > 0 && <TokenPerformance tokens={tokens} />}

            {/* Portfolio Allocation Chart */}
            {tokens.length > 0 && <PortfolioAllocation tokens={tokens} />}

            <Card>
              <CardHeader>
                <CardTitle>Snapshot History</CardTitle>
                <CardDescription>
                  Last 5 snapshots for this wallet
                </CardDescription>
                <CardAction>
                  <Link href="/snapshots">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {isHistoryLoading && (
                  <div className="text-sm text-muted-foreground">
                    Loading snapshots...
                  </div>
                )}
                {!isHistoryLoading &&
                  (!snapshotHistory || snapshotHistory.data.length === 0) && (
                    <div className="text-sm text-muted-foreground">
                      No snapshots yet. Save one to get started.
                    </div>
                  )}
                {!isHistoryLoading &&
                  snapshotHistory &&
                  snapshotHistory.data.length > 0 && (
                    <div className="space-y-2">
                      {snapshotHistory.data.map((snap) => (
                        <div
                          key={snap.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {new Date(snap.createdAt).toLocaleString()}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(snap.totalValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
                <CardDescription>
                  Your portfolio value over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-muted-foreground">
                    Chart will be implemented here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

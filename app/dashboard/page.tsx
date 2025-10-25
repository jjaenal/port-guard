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
} from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { useQuery } from "@tanstack/react-query";

import { formatUnits } from "viem";
import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { formatCurrency, formatNumber, formatPercentSigned } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useLatestSnapshot } from "@/lib/hooks/useLatestSnapshot";
import { useSnapshotHistory } from "@/lib/hooks/useSnapshotHistory";
import { TokenHoldingsTable } from "@/components/ui/token-holdings-table";
import { usePortfolioSeries } from "@/lib/hooks/usePortfolioSeries";
import { PortfolioChart } from "@/components/ui/portfolio-chart";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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

  // Debug logging
  console.log("🔍 Dashboard - Wallet status:", {
    address,
    isConnected,
    overrideAddress,
    effectiveAddress: overrideAddress || address,
  });

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
  const portfolioChange24hPercent = useMemo(() => {
    if (!portfolioPoints1d || portfolioPoints1d.length < 2) return 0;
    const start = portfolioPoints1d[0].v;
    const end = portfolioPoints1d[portfolioPoints1d.length - 1].v;
    return start > 0 ? ((end - start) / start) * 100 : 0;
  }, [portfolioPoints1d]);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSaveMsg(`Failed to save snapshot: ${msg}`);
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Portfolio Dashboard</h1>
        <p className="text-muted-foreground">
          {isConnected
            ? `Wallet: ${address}`
            : "Welcome to your DeFi portfolio dashboard. Connect your wallet to get started."}
        </p>
        {isConnected && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground">
                Test with another address (optional)
              </label>
              <Input
                placeholder="0x... wallet address"
                value={overrideAddress}
                onChange={(e) => setOverrideAddress(e.target.value.trim())}
              />
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-6">
            {/* Total Portfolio Value card with 24h change */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Portfolio Value
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tokens
                </CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  ETH 24h Change
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  MATIC 24h Change
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Latest Snapshot
                </CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
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

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance ({rangeDays}d)</CardTitle>
                <CardDescription>
                  Value based on ETH, MATIC & top ERC-20
                </CardDescription>
                <CardAction>
                  <div className="flex gap-2">
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
                  <PortfolioChart
                    points={portfolioPoints}
                    width={600}
                    height={200}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-background">
              <CardHeader>
                <CardTitle>Uniswap v3 LP</CardTitle>
                <CardDescription>
                  Summary of your LP positions on ETH & Polygon
                </CardDescription>
                <CardAction>
                  <div className="flex items-center gap-2">
                    {isUniswapFetching && (
                      <span className="text-xs text-muted-foreground">
                        Refreshing…
                      </span>
                    )}
                    {(overrideAddress || address) && (
                      <Link
                        href={`/defi/uniswap?address=${overrideAddress || address}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View details
                      </Link>
                    )}
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
                      <p className="text-sm text-muted-foreground">Positions</p>
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
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Avg APR (7d)
                      </p>
                      <p className="font-medium">
                        {formatPercentSigned(uniswapData?.avgApr7d ?? 0)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      APR is estimated from 7-day pool volume and fee tier.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Estimate based on pool TVL share. Actual values may
                      differ.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">


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

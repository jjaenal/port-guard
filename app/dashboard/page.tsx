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
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useLatestSnapshot } from "@/lib/hooks/useLatestSnapshot";
import { useSnapshotHistory } from "@/lib/hooks/useSnapshotHistory";
import { TokenHoldingsTable } from "@/components/ui/token-holdings-table";
import { usePortfolioSeries } from "@/lib/hooks/usePortfolioSeries";
import { PortfolioChart } from "@/components/ui/portfolio-chart";

// Add useToast import at the top with other imports
import { useToast } from "@/components/ui/toast-provider";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const {
    eth,
    matic,
    isLoading,
    refetch: refetchNativeBalances,
    isError: isNativeBalancesError,
    error: nativeBalancesError,
    updatedAt: nativeUpdatedAt,
  } = useNativeBalances();
  const [overrideAddress, setOverrideAddress] = useState<string>("");
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back online", type: "success", duration: 2000 });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You are offline",
        description: "Network connectivity lost",
        type: "warning",
      });
    };

    updateOnline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Debug logging
  console.log("🔍 Dashboard - Wallet status:", {
    address,
    isConnected,
    overrideAddress,
    effectiveAddress: overrideAddress || address,
  });

  // Handle native balance refresh with toast notifications
  const handleRefreshNativeBalances = async () => {
    toast({
      title: "Refreshing native balances...",
      type: "info",
      duration: 2000,
    });

    try {
      await refetchNativeBalances();
      toast({
        title: "Native balances refreshed",
        description: "Latest ETH and MATIC balances loaded successfully",
        type: "success",
      });
    } catch (error) {
      toast({
        title: "Failed to refresh native balances",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        type: "error",
      });
    }
  };
  const {
    tokens,
    isLoading: isTokensLoading,
    isError: isTokensError,
    isFetching: isTokensFetching,
    error: tokensError,
    refetch: refetchTokens,
    updatedAt: tokensUpdatedAt,
  } = useTokenHoldings(overrideAddress ? overrideAddress : undefined);

  // Handle token refresh with toast notifications
  const handleRefreshTokens = async () => {
    toast({ title: "Refreshing tokens...", type: "info", duration: 2000 });
    try {
      const result = await refetchTokens();
      if (result?.data) {
        toast({
          title: "Tokens refreshed",
          description: "Latest holdings loaded",
          type: "success",
        });
      } else {
        toast({
          title: "No changes",
          description: "Token data unchanged",
          type: "info",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to refresh tokens",
        description: error instanceof Error ? error.message : "Unknown error",
        type: "error",
      });
    }
  };
  const {
    data: latestSnapshot,
    isLoading: isSnapshotLoading,
    error: snapshotError,
  } = useLatestSnapshot(address);

  const { data: snapshotHistory, isLoading: isHistoryLoading } =
    useSnapshotHistory(address, 5);

  const {
    data: prices,
    isLoading: isPricesLoading,
    isError: isPricesError,
    error: pricesError,
    refetch: refetchPrices,
    dataUpdatedAt: pricesUpdatedAt,
  } = useQuery({
    queryKey: ["api-prices", "eth-matic"],
    queryFn: async () => {
      const response = await fetch(
        "/api/prices?ids=ethereum,matic-network&vs=usd"
      );
      const json = await response.json();
      return json.data || {};
    },
    enabled: isConnected,
    retry: 1,
    staleTime: 60_000,
  });

  const handleRefreshPrices = async () => {
    toast({ title: "Refreshing prices...", type: "info", duration: 2000 });
    try {
      const result = await refetchPrices();
      if (result?.data) {
        toast({
          title: "Prices refreshed",
          description: "Latest ETH/MATIC prices loaded",
          type: "success",
        });
      } else {
        toast({
          title: "No changes",
          description: "Prices unchanged",
          type: "info",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to refresh prices",
        description: error instanceof Error ? error.message : "Unknown error",
        type: "error",
      });
    }
  };

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
      rangeDays
    );

  // Hitung persen perubahan dari series
  const firstPoint =
    portfolioPoints && portfolioPoints.length > 0 ? portfolioPoints[0] : null;
  const lastPoint =
    portfolioPoints && portfolioPoints.length > 0
      ? portfolioPoints[portfolioPoints.length - 1]
      : null;
  const portfolioChangePct =
    firstPoint && lastPoint && firstPoint.v > 0
      ? ((lastPoint.v - firstPoint.v) / firstPoint.v) * 100
      : 0;
  const portfolioChangeAbs =
    firstPoint && lastPoint ? lastPoint.v - firstPoint.v : 0;
  const lastUpdatedTs = Math.max(
    0,
    ...[tokensUpdatedAt, pricesUpdatedAt, nativeUpdatedAt].filter(
      (x): x is number => typeof x === "number"
    )
  );
  const lastUpdatedStr = lastUpdatedTs
    ? new Date(lastUpdatedTs).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const handleSaveSnapshot = useCallback(async () => {
    if (!address) return;
    try {
      setSaving(true);
      setSaveMsg(null);

      toast({
        title: "Saving portfolio snapshot...",
        type: "info",
        duration: 2000,
      });

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

      toast({
        title: "Portfolio snapshot saved",
        description: "Your current portfolio has been saved successfully",
        type: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSaveMsg(`Failed to save snapshot: ${msg}`);

      toast({
        title: "Failed to save snapshot",
        description: msg,
        type: "error",
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
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
                        "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
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
                        "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503"
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
                        "0x28C6c06298d514Db089934071355E5743bf21d60"
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-8">
            {/* Total Portfolio Value card unchanged except totalUsd now includes ERC-20 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Portfolio Value
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isPortfolioLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-36 bg-muted rounded mb-2" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                ) : isPricesError ? (
                  <div className="flex items-start justify-between p-3 border rounded bg-destructive/10">
                    <div>
                      <p className="font-medium text-destructive">
                        Failed to load prices
                      </p>
                      {typeof pricesError?.message === "string" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {pricesError.message}
                        </p>
                      )}
                      {!isOnline && (
                        <p className="text-xs mt-1 text-yellow-600">Offline</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshPrices}
                      disabled={!isOnline}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold flex items-center gap-3">
                      {formatCurrency(totalUsd)}
                      <span
                        className={`text-xs px-2 py-1 rounded border ${portfolioChangePct === 0 ? "text-muted-foreground" : portfolioChangePct > 0 ? "text-green-600 border-green-600/40" : "text-red-600 border-red-600/40"}`}
                        aria-label="Portfolio percent change"
                        title={`${portfolioChangePct > 0 ? "+" : ""}${portfolioChangePct.toFixed(2)}% (${formatCurrency(portfolioChangeAbs)})`}
                      >
                        {portfolioChangePct > 0 ? "+" : ""}
                        {portfolioChangePct.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lastUpdatedStr
                        ? `Last updated ${lastUpdatedStr}`
                        : "Updated with live prices"}
                    </p>
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleRefreshNativeBalances}
                    disabled={isLoading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`${isLoading ? "animate-spin" : ""}`}
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 21h5v-5"></path>
                    </svg>
                  </Button>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
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
                        prices?.ethereum?.usd_24h_change ?? 0
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleRefreshNativeBalances}
                    disabled={isLoading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`${isLoading ? "animate-spin" : ""}`}
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 21h5v-5"></path>
                    </svg>
                  </Button>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
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
                        prices?.["matic-network"]?.usd_24h_change ?? 0
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
                          }
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
                  <div className="overflow-x-auto">
                    <PortfolioChart
                      points={portfolioPoints}
                      width={600}
                      height={200}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Holdings</CardTitle>
                <CardDescription>
                  Your current token balances and values
                </CardDescription>
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
                            prices?.ethereum?.usd_24h_change ?? 0
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
                            prices?.["matic-network"]?.usd_24h_change ?? 0
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
                  <div className="flex items-start justify-between p-3 border rounded bg-destructive/10">
                    <div>
                      <p className="font-medium text-destructive">
                        Failed to load token holdings
                      </p>
                      {typeof tokensError?.message === "string" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {tokensError.message}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshTokens}
                    >
                      Retry
                    </Button>
                  </div>
                ) : tokens.length === 0 ? (
                  <p className="text-muted-foreground">
                    No ERC-20 tokens detected.
                  </p>
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

            <Card className="mt-6">
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

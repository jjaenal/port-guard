"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Wallet, TrendingUp, Coins, DollarSign, Camera, Clock } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { useQuery } from "@tanstack/react-query";

import { formatUnits } from "viem";
import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercentSigned, formatCurrencyTiny } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { useLatestSnapshot } from "@/lib/hooks/useLatestSnapshot";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { eth, matic, isLoading } = useNativeBalances();
  const { tokens, isLoading: isTokensLoading, isError: isTokensError, isFetching: isTokensFetching } = useTokenHoldings();
  const { data: latestSnapshot, isLoading: isSnapshotLoading, error: snapshotError } = useLatestSnapshot(address);

  const { data: prices, isLoading: isPricesLoading, isError: isPricesError } = useQuery({
    queryKey: ["api-prices", "eth-matic"],
    queryFn: async () => {
      const response = await fetch("/api/prices?ids=ethereum,matic-network&vs=usd");
      const json = await response.json();
      return json.data || {};
    },
    enabled: isConnected,
    retry: 1,
    staleTime: 60_000,
  });

  const ethAmount = eth ? Number(formatUnits(eth.value, eth.decimals)) : 0;
  const maticAmount = matic
    ? Number(formatUnits(matic.value, matic.decimals))
    : 0;
  const ethUsd = prices?.ethereum?.usd ? ethAmount * prices.ethereum.usd : 0;
  const maticUsd = prices?.["matic-network"]?.usd
    ? maticAmount * prices["matic-network"].usd
    : 0;
  const totalUsd = ethUsd + maticUsd + (tokens?.reduce((acc, t) => acc + (t.valueUsd ?? 0), 0) ?? 0);
  const isPortfolioLoading = isLoading || (isConnected && isPricesLoading) || (isConnected && isTokensLoading);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const handleSaveSnapshot = useCallback(async () => {
    if (!address) return;
    try {
      setSaving(true);
      setSaveMsg(null);

      const nativeTokens = [] as Array<{
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
  }, [address, eth, matic, ethAmount, maticAmount, ethUsd, maticUsd, prices, tokens]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Portfolio Dashboard</h1>
        <p className="text-muted-foreground">
          {isConnected
            ? `Wallet: ${address}`
            : "Welcome to your DeFi portfolio dashboard. Connect your wallet to get started."}
        </p>
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
          </CardContent>
        </Card>
      )}

      {isConnected && (
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
                {/* Skeleton saat loading */}
                {isPortfolioLoading ? (
                  <div className="animate-pulse">
                    <div className="h-7 w-36 bg-muted rounded mb-2" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {isPricesError ? "-" : formatCurrency(totalUsd)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isPricesError
                        ? "Prices unavailable"
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
                <div className="text-2xl font-bold">{2 + (tokens?.length ?? 0)}</div>
                <p className="text-xs text-muted-foreground">Mainnet + Polygon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ETH 24h Change</CardTitle>
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
                      {formatPercentSigned(prices?.ethereum?.usd_24h_change ?? 0)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">vs. previous day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MATIC 24h Change</CardTitle>
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
                      {formatPercentSigned(prices?.["matic-network"]?.usd_24h_change ?? 0)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">vs. previous day</p>
              </CardContent>
            </Card>

            {/* Latest Snapshot Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Latest Snapshot</CardTitle>
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
                    <div className="text-2xl font-bold text-muted-foreground">-</div>
                    <p className="text-xs text-muted-foreground">No snapshot yet</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(latestSnapshot.totalValue)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(latestSnapshot.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <Button onClick={handleSaveSnapshot} disabled={!isConnected || saving || isPortfolioLoading}>
              {saving ? "Saving…" : "Save Snapshot"}
            </Button>
            {saveMsg && <span className="text-sm text-muted-foreground">{saveMsg}</span>}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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
                            {formatNumber(ethAmount, { maximumFractionDigits: 6 })} ETH
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
                          {formatPercentSigned(prices?.ethereum?.usd_24h_change ?? 0)}
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
                            {formatNumber(maticAmount, { maximumFractionDigits: 6 })} MATIC
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
                          {formatPercentSigned(prices?.["matic-network"]?.usd_24h_change ?? 0)}
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
                <CardDescription>Your ERC-20 balances and USD values</CardDescription>
                <CardAction>
                  {isTokensFetching && (
                    <span className="text-xs text-muted-foreground">Refreshing…</span>
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
                  <p className="text-destructive">Failed to load token holdings.</p>
                ) : tokens.length === 0 ? (
                  <p className="text-muted-foreground">No ERC-20 tokens detected.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Chain</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Price (USD)</TableHead>
                        <TableHead>Value (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokens.map((t) => (
                        <TableRow key={`${t.chain}-${t.contractAddress}`}>
                          <TableCell>
                            <div className="font-medium">{t.symbol ?? "?"}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.name ?? t.contractAddress.slice(0, 6) + "..."}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{t.chain}</TableCell>
                          <TableCell>
                            {t.formatted ? formatNumber(Number(t.formatted), { maximumFractionDigits: 6 }) : "-"}
                          </TableCell>
                          <TableCell>{t.priceUsd ? formatCurrencyTiny(t.priceUsd) : "-"}</TableCell>
                          <TableCell>{t.valueUsd ? formatCurrencyTiny(t.valueUsd) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>Showing ERC-20 balances on Ethereum & Polygon</TableCaption>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
                <CardDescription>Your portfolio value over time</CardDescription>
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

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, TrendingUp, Coins, DollarSign } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { useQuery } from "@tanstack/react-query";
import { getSimplePrices } from "@/lib/utils/coingecko";
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

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { eth, matic, isLoading } = useNativeBalances();
  const { tokens, isLoading: isTokensLoading, isError: isTokensError } = useTokenHoldings();

  const { data: prices, isLoading: isPricesLoading, isError: isPricesError } = useQuery({
    queryKey: ["cg-prices", "eth-matic"],
    queryFn: () => getSimplePrices(["ethereum", "matic-network"], "usd"),
    enabled: isConnected,
    retry: 1,
    staleTime: 30_000,
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
                      {isPricesError ? "-" : `$${totalUsd.toFixed(2)}`}
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
                <CardTitle className="text-sm font-medium">
                  DeFi Positions
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">24h P&L</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isPricesError
                    ? "-"
                    : prices
                    ? (
                        (ethUsd * (prices.ethereum.usd_24h_change ?? 0)) / 100 +
                        (maticUsd *
                          (prices["matic-network"].usd_24h_change ?? 0)) /
                          100
                      ).toFixed(2)
                    : "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Approx. based on 24h change
                </p>
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
                            {ethAmount.toFixed(6)} ETH
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
                          {(prices?.ethereum?.usd_24h_change ?? 0).toFixed(2)}%
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
                            {maticAmount.toFixed(6)} MATIC
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
                          {(prices?.["matic-network"]?.usd_24h_change ?? 0).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>DeFi Positions</CardTitle>
                <CardDescription>
                  Your active positions across DeFi protocols
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-muted-foreground">
                  <p>No active positions yet</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ERC-20 Token Holdings</CardTitle>
              <CardDescription>Your ERC-20 balances and USD values</CardDescription>
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
                          {t.formatted ? Number(t.formatted).toFixed(6) : "-"}
                        </TableCell>
                        <TableCell>{t.priceUsd ? `$${t.priceUsd.toFixed(4)}` : "-"}</TableCell>
                        <TableCell>{t.valueUsd ? `$${t.valueUsd.toFixed(2)}` : "-"}</TableCell>
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
        </>
      )}
    </div>
  );
}

"use client";

import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { usePortfolioSeries } from "@/lib/hooks/usePortfolioSeries";
import { AnalyticsCards } from "@/components/ui/analytics-cards";
import { PortfolioChart } from "@/components/ui/portfolio-chart";
import { TokenAllocation } from "@/components/ui/token-allocation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";

export default function AnalyticsPage() {
  const { isConnected } = useAccount();
  const [rangeDays, setRangeDays] = useState<number>(7);

  const {
    tokens,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useTokenHoldings();

  const {
    eth,
    matic,
  } = useNativeBalances();

  // Calculate amounts from native balances (same as Dashboard)
  const ethAmount = eth ? Number(formatUnits(eth.value, eth.decimals)) : 0;
  const maticAmount = matic
    ? Number(formatUnits(matic.value, matic.decimals))
    : 0;

  const { points: portfolioPoints, isLoading: isSeriesLoading } =
    usePortfolioSeries(
      ethAmount,
      maticAmount,
      tokens,
      isConnected,
      rangeDays,
    );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Analytics</h1>
      <p className="text-muted-foreground mb-6">
        Portfolio insights based on your current ERC-20 holdings and 24h price movements.
      </p>

      {isError && (
        <div className="flex items-start justify-between p-3 border rounded bg-destructive/10 mb-6">
          <div>
            <p className="font-medium text-destructive">Failed to load analytics</p>
            {typeof (error as Error)?.message === "string" && (
              <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
            )}
          </div>
          <button
            className="px-3 py-1 text-sm rounded border"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Retry
          </button>
        </div>
      )}

      <AnalyticsCards tokens={tokens} isLoading={isLoading || isFetching} />

      {/* Portfolio Chart Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>
            Historical portfolio value over time
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

      {/* Token Allocation Section */}
      <div className="mt-6">
        <TokenAllocation tokens={tokens} isLoading={isLoading || isFetching} />
      </div>

      {!isLoading && !isFetching && tokens.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Connect your wallet to see analytics.</p>
      )}
    </div>
  );
}

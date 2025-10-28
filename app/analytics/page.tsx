"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { usePortfolioSeries } from "@/lib/hooks/usePortfolioSeries";
import { PortfolioChart } from "@/components/ui/portfolio-chart";
import { PortfolioAllocation } from "@/components/ui/portfolio-allocation";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { AllocationSkeleton } from "@/components/ui/allocation-skeleton";
import { formatUnits } from "viem";
import { useMemo, useState } from "react";

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const { eth, matic, isLoading: isNativeLoading } = useNativeBalances();
  const { tokens, isLoading: isTokensLoading } = useTokenHoldings(
    address ?? undefined,
  );

  const [rangeDays, setRangeDays] = useState<number>(30);
  const [chainFilter, setChainFilter] = useState<"all" | "ethereum" | "polygon">("all");

  const ethAmount = useMemo(
    () => (eth ? Number(formatUnits(eth.value, eth.decimals)) : 0),
    [eth],
  );
  const maticAmount = useMemo(
    () => (matic ? Number(formatUnits(matic.value, matic.decimals)) : 0),
    [matic],
  );

  const filteredTokens = useMemo(() => {
    if (!tokens || chainFilter === "all") return tokens;
    return tokens.filter((t) => t.chain === chainFilter);
  }, [tokens, chainFilter]);

  const { points, isLoading: isSeriesLoading } = usePortfolioSeries(
    ethAmount,
    maticAmount,
    filteredTokens,
    isConnected,
    rangeDays,
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio value and allocation over time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">
                Range
              </div>
              <div className="flex gap-2">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    className={`px-2 py-1 rounded border text-xs ${rangeDays === d ? "bg-muted" : ""}`}
                    onClick={() => setRangeDays(d)}
                    aria-pressed={rangeDays === d}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {isNativeLoading || isTokensLoading || isSeriesLoading ? (
              <ChartSkeleton />
            ) : (
              <PortfolioChart points={points} height={260} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">Chain</div>
              <div className="flex gap-2">
                {["all", "ethereum", "polygon"].map((c) => (
                  <button
                    key={c}
                    className={`px-2 py-1 rounded border text-xs ${chainFilter === c ? "bg-muted" : ""}`}
                    onClick={() => setChainFilter(c as typeof chainFilter)}
                    aria-pressed={chainFilter === c}
                  >
                    {c === "all" ? "All" : c === "ethereum" ? "Ethereum" : "Polygon"}
                  </button>
                ))}
              </div>
            </div>
            {isTokensLoading ? (
              <AllocationSkeleton />
            ) : (
              <PortfolioAllocation tokens={filteredTokens ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
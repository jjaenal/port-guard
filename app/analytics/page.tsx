"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { usePortfolioSeries } from "@/lib/hooks/usePortfolioSeries";
import { PortfolioChart } from "@/components/ui/portfolio-chart";
import { PortfolioAllocation } from "@/components/ui/portfolio-allocation";
import { formatUnits } from "viem";
import { useMemo, useState } from "react";

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const { eth, matic, isLoading: isNativeLoading } = useNativeBalances();
  const { tokens, isLoading: isTokensLoading } = useTokenHoldings(
    address ?? undefined,
  );

  const [rangeDays, setRangeDays] = useState<number>(30);

  const ethAmount = useMemo(
    () => (eth ? Number(formatUnits(eth.value, eth.decimals)) : 0),
    [eth],
  );
  const maticAmount = useMemo(
    () => (matic ? Number(formatUnits(matic.value, matic.decimals)) : 0),
    [matic],
  );

  const { points, isLoading: isSeriesLoading } = usePortfolioSeries(
    ethAmount,
    maticAmount,
    tokens,
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
            <PortfolioChart points={points} height={260} />
            {(isNativeLoading || isTokensLoading || isSeriesLoading) && (
              <p className="text-xs text-muted-foreground mt-2">
                Loading analytics...
              </p>
            )}
          </CardContent>
        </Card>

        <PortfolioAllocation tokens={tokens ?? []} />
      </div>
    </div>
  );
}
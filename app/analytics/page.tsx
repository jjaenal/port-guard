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
import { useSearchParams, useRouter } from "next/navigation";

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const { eth, matic, isLoading: isNativeLoading } = useNativeBalances();
  const { tokens, isLoading: isTokensLoading } = useTokenHoldings(
    address ?? undefined,
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState<number>(() => {
    const r = Number(searchParams.get("range") || 30);
    return [7, 30, 90].includes(r) ? r : 30;
  });
  const [chainFilter, setChainFilter] = useState<"all" | "ethereum" | "polygon">(() => {
    const c = (searchParams.get("chain") || "all") as "all" | "ethereum" | "polygon";
    return ["all", "ethereum", "polygon"].includes(c) ? c : "all";
  });
  const [hideTiny, setHideTiny] = useState<boolean>(() => searchParams.get("hideTiny") === "1");

  const updateParam = (key: string, value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`?${sp.toString()}`);
  };

  const ethAmount = useMemo(
    () => (eth ? Number(formatUnits(eth.value, eth.decimals)) : 0),
    [eth],
  );
  const maticAmount = useMemo(
    () => (matic ? Number(formatUnits(matic.value, matic.decimals)) : 0),
    [matic],
  );

  const filteredTokens = useMemo(() => {
    const byChain = !tokens
      ? []
      : chainFilter === "all"
        ? tokens
        : tokens.filter((t) => t.chain === chainFilter);
    if (!hideTiny) return byChain;
    return byChain.filter((t) => {
      const v = t.valueUsd ?? (Number(t.formatted || "0") * (t.priceUsd ?? 0));
      return v >= 1; // hide positions under $1
    });
  }, [tokens, chainFilter, hideTiny]);

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
                    onClick={() => {
                      setRangeDays(d);
                      updateParam("range", String(d));
                    }}
                    aria-pressed={rangeDays === d}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {!isConnected ? (
              <p className="text-sm text-muted-foreground">Connect your wallet to see analytics.</p>
            ) : isNativeLoading || isTokensLoading || isSeriesLoading ? (
              <ChartSkeleton />
            ) : points.length > 0 ? (
              <PortfolioChart points={points} height={260} />
            ) : (
              <div className="w-full min-h-[200px] flex items-center justify-center border rounded bg-muted/20">
                <p className="text-xs text-muted-foreground">No data for selected range.</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">Filters</div>
              <div className="flex flex-wrap gap-2 items-center">
                {["all", "ethereum", "polygon"].map((c) => (
                  <button
                    key={c}
                    className={`px-2 py-1 rounded border text-xs ${chainFilter === c ? "bg-muted" : ""}`}
                    onClick={() => {
                      setChainFilter(c as typeof chainFilter);
                      updateParam("chain", c);
                    }}
                    aria-pressed={chainFilter === c}
                  >
                    {c === "all" ? "All" : c === "ethereum" ? "Ethereum" : "Polygon"}
                  </button>
                ))}
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={hideTiny}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setHideTiny(v);
                      updateParam("hideTiny", v ? "1" : "0");
                    }}
                  />
                  Hide tiny positions (&lt;$1)
                </label>
              </div>
            </div>
            {!isConnected ? (
              <p className="text-sm text-muted-foreground">Connect your wallet to see allocation.</p>
            ) : isTokensLoading ? (
              <AllocationSkeleton />
            ) : filteredTokens && filteredTokens.length > 0 ? (
              <PortfolioAllocation tokens={filteredTokens ?? []} />
            ) : (
              <div className="w-full min-h-[120px] flex items-center justify-center border rounded bg-muted/20">
                <p className="text-xs text-muted-foreground">No positions to allocate.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
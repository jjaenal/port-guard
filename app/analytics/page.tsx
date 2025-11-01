"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "wagmi";
import { useNativeBalances } from "@/lib/hooks/useNativeBalances";
import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { usePortfolioSeriesToasts } from "@/lib/hooks/usePortfolioSeries";
import { PortfolioChart } from "@/components/ui/portfolio-chart";
import { PortfolioAllocation } from "@/components/ui/portfolio-allocation";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";
import { AllocationSkeleton } from "@/components/ui/allocation-skeleton";
import { CronStatsPanel } from "@/components/ui/cron-stats-panel";
import { formatUnits } from "viem";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const { eth, matic, isLoading: isNativeLoading } = useNativeBalances();
  const {
    tokens,
    isLoading: isTokensLoading,
    isError: isTokensError,
    error: tokensError,
  } = useTokenHoldings(address ?? undefined);

  const searchParams = useSearchParams();
  const router = useRouter();
  // Initialize state with URL params or localStorage fallback
  const [rangeDays, setRangeDays] = useState(() => {
    const urlRange = Number(searchParams.get("range"));
    if (urlRange && [7, 30, 90].includes(urlRange)) return urlRange;

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("analytics-range");
      return saved ? parseInt(saved, 10) : 30;
    }
    return 30;
  });

  const [chainFilter, setChainFilter] = useState<
    "all" | "ethereum" | "polygon" | "arbitrum"
  >(() => {
    const urlChain = searchParams.get("chain") as
      | "all"
      | "ethereum"
      | "polygon"
      | "arbitrum";
    // Validasi nilai chain dari URL, dukung 'arbitrum'
    if (
      urlChain &&
      ["all", "ethereum", "polygon", "arbitrum"].includes(urlChain)
    )
      return urlChain;

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("analytics-chain");
      return (saved as "all" | "ethereum" | "polygon" | "arbitrum") || "all";
    }
    return "all";
  });

  const [hideTiny, setHideTiny] = useState(() => {
    if (searchParams.has("hideTiny"))
      return searchParams.get("hideTiny") === "1";

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("analytics-hideTiny");
      return saved === "true";
    }
    return false;
  });

  const updateParam = (key: string, value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`?${sp.toString()}`);
  };

  // Save to localStorage when state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("analytics-range", String(rangeDays));
    }
  }, [rangeDays]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("analytics-chain", chainFilter);
    }
  }, [chainFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("analytics-hideTiny", String(hideTiny));
    }
  }, [hideTiny]);

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
      const v = t.valueUsd ?? Number(t.formatted || "0") * (t.priceUsd ?? 0);
      return v >= 1; // hide positions under $1
    });
  }, [tokens, chainFilter, hideTiny]);

  const { points, isLoading: isSeriesLoading } = usePortfolioSeriesToasts(
    ethAmount,
    maticAmount,
    filteredTokens,
    isConnected,
    rangeDays,
  );

  // Surface token holdings fetching errors with friendly toasts (similar to Dashboard)
  useEffect(() => {
    if (isTokensError && tokensError) {
      const errorMsg = (tokensError as Error)?.message || "";
      if (errorMsg.toLowerCase().includes("network")) {
        toast.error("Network error. Check your connection.");
      } else if (errorMsg.includes("Both chains failed")) {
        toast.error("Unable to connect to blockchain networks");
      } else if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
        toast.error("Rate limit exceeded for token data");
      } else {
        toast.error("Failed to fetch token holdings");
      }
    }
  }, [isTokensError, tokensError]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio value and allocation over time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Cron Statistics Panel */}
        <CronStatsPanel />

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">Filters</div>
              <div className="flex flex-wrap gap-2 items-center">
                {["all", "ethereum", "polygon", "arbitrum"].map((c) => (
                  <button
                    key={c}
                    className={`px-2 py-1 rounded border text-xs ${chainFilter === c ? "bg-muted" : ""}`}
                    onClick={() => {
                      setChainFilter(c as typeof chainFilter);
                      updateParam("chain", c);
                    }}
                    aria-pressed={chainFilter === c}
                  >
                    {c === "all"
                      ? "All Chains"
                      : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
                <div className="w-px h-4 bg-border mx-1" />
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
              <p className="text-sm text-muted-foreground">
                Connect your wallet to see analytics.
              </p>
            ) : isNativeLoading || isTokensLoading || isSeriesLoading ? (
              <ChartSkeleton />
            ) : points.length > 0 ? (
              <PortfolioChart points={points} height={260} />
            ) : (
              <div className="w-full min-h-[200px] flex items-center justify-center border rounded bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  No data for selected range.
                </p>
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
                {["all", "ethereum", "polygon", "arbitrum", "optimism"].map((c) => (
                  <button
                    key={c}
                    className={`px-2 py-1 rounded border text-xs ${chainFilter === c ? "bg-muted" : ""}`}
                    onClick={() => {
                      setChainFilter(c as typeof chainFilter);
                      updateParam("chain", c);
                    }}
                    aria-pressed={chainFilter === c}
                  >
                    {c === "all"
                      ? "All"
                      : c === "ethereum"
                        ? "Ethereum"
                        : c === "polygon"
                          ? "Polygon"
                          : c === "arbitrum"
                            ? "Arbitrum"
                            : "Optimism"}
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
              <p className="text-sm text-muted-foreground">
                Connect your wallet to see allocation.
              </p>
            ) : isTokensLoading ? (
              <AllocationSkeleton />
            ) : filteredTokens && filteredTokens.length > 0 ? (
              <PortfolioAllocation tokens={filteredTokens ?? []} />
            ) : (
              <div className="w-full min-h-[120px] flex items-center justify-center border rounded bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  No positions to allocate.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

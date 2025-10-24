"use client";

import { useTokenHoldings } from "@/lib/hooks/useTokenHoldings";
import { AnalyticsCards } from "@/components/ui/analytics-cards";

export default function AnalyticsPage() {
  const {
    tokens,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useTokenHoldings();

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

      {!isLoading && !isFetching && tokens.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Connect your wallet to see analytics.</p>
      )}
    </div>
  );
}

"use client";

import type { TokenHoldingDTO } from "@/lib/blockchain/balances";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatPercentSigned } from "@/lib/utils";

type Props = {
  tokens: TokenHoldingDTO[];
  isLoading?: boolean;
};

export function PortfolioSummary({ tokens, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
          <CardDescription>Loading portfolio overview…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-24 w-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const items = (tokens || []).filter((t) => typeof t.valueUsd === "number" && !Number.isNaN(t.valueUsd));
  const totalValue = items.reduce((sum, t) => sum + (t.valueUsd || 0), 0);

  const deltas = items.map((t) => {
    const pct = (t.priceChange24h || 0) / 100;
    const delta = (t.valueUsd || 0) * pct;
    return { delta };
  });
  const netDelta = deltas.reduce((acc, d) => acc + d.delta, 0);
  const netPct = totalValue > 0 ? (netDelta / totalValue) * 100 : 0;

  const tokenCount = items.length;
  const ethCount = items.filter((t) => t.chain === "ethereum").length;
  const polygonCount = items.filter((t) => t.chain === "polygon").length;

  const top = items.length > 0 ? items.reduce((a, b) => ((b.valueUsd || 0) > (a.valueUsd || 0) ? b : a)) : undefined;
  const topPct = top && totalValue > 0 ? (((top.valueUsd || 0) / totalValue) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Summary</CardTitle>
        <CardDescription>Overview of total value and daily change</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
            <p className={`text-sm ${netDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(Math.abs(netDelta))} ({formatPercentSigned(netPct)}) {netDelta >= 0 ? "today" : "loss"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Holdings</p>
            <p className="text-3xl font-bold">{tokenCount}</p>
            <p className="text-sm text-muted-foreground">ETH: {ethCount} • POLYGON: {polygonCount}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Top Weight</p>
            {top ? (
              <div>
                <p className="text-3xl font-bold">{formatPercentSigned(topPct)}</p>
                <p className="text-sm text-muted-foreground">{top.symbol || top.name || top.contractAddress.slice(0, 6)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
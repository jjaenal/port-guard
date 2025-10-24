"use client";

import type { TokenHoldingDTO } from "@/lib/blockchain/balances";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  tokens: TokenHoldingDTO[];
  isLoading?: boolean;
};

function formatCurrency(n: number) {
  return Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatPercentSigned(n: number) {
  const fixed = n.toFixed(2);
  return `${n > 0 ? "+" : ""}${fixed}%`;
}

export function AnalyticsCards({ tokens, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="animate-pulse h-24 bg-muted rounded" />
        <div className="animate-pulse h-24 bg-muted rounded" />
        <div className="animate-pulse h-24 bg-muted rounded" />
        <div className="animate-pulse h-24 bg-muted rounded" />
      </div>
    );
  }

  const items = (tokens || []).filter((t) => typeof t.valueUsd === "number" && !Number.isNaN(t.valueUsd));
  const deltas = items.map((t) => {
    const pct = (t.priceChange24h ?? 0) / 100;
    const delta = (t.valueUsd ?? 0) * pct;
    return { token: t, delta, pct: t.priceChange24h ?? 0 };
  });

  const totalGain = deltas.reduce((acc, d) => (d.delta > 0 ? acc + d.delta : acc), 0);
  const totalLoss = deltas.reduce((acc, d) => (d.delta < 0 ? acc + Math.abs(d.delta) : acc), 0);
  const netPL = totalGain - totalLoss;

  const best = deltas.length > 0 ? deltas.reduce((a, b) => (b.delta > a.delta ? b : a)) : null;
  const worst = deltas.length > 0 ? deltas.reduce((a, b) => (b.delta < a.delta ? b : a)) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Net Profit/Loss (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netPL >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(Math.abs(netPL))}{netPL >= 0 ? "" : " loss"}</div>
          <p className="text-xs text-muted-foreground">Sum of all token 24h changes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Gains (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalGain)}</div>
          <p className="text-xs text-muted-foreground">{items.filter((t) => (t.priceChange24h ?? 0) > 0).length} gainers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Losses (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalLoss)}</div>
          <p className="text-xs text-muted-foreground">{items.filter((t) => (t.priceChange24h ?? 0) < 0).length} losers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Movers (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {best ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Best: {best.token.symbol ?? best.token.name ?? best.token.contractAddress.slice(0, 6)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(best.delta)} ({formatPercentSigned(best.pct)})</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
          {worst ? (
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="font-medium">Worst: {worst.token.symbol ?? worst.token.name ?? worst.token.contractAddress.slice(0, 6)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(Math.abs(worst.delta))} ({formatPercentSigned(worst.pct)})</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

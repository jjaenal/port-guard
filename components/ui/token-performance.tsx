"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";
import {
  formatCurrencyTiny,
  formatPercentSigned,
  formatNumber,
} from "@/lib/utils";
import Image from "next/image";

interface TokenPerformanceProps {
  tokens: TokenHoldingDTO[];
}

interface TokenPerformance {
  token: TokenHoldingDTO;
  change24hUsd: number;
  performance: "gain" | "loss" | "neutral";
}

export function TokenPerformance({ tokens }: TokenPerformanceProps) {
  const analytics = useMemo(() => {
    if (!tokens.length) {
      return {
        totalGains: 0,
        totalLosses: 0,
        netPnL: 0,
        bestPerformer: null,
        worstPerformer: null,
        gainers: [],
        losers: [],
        neutral: [],
      };
    }

    const performances: TokenPerformance[] = tokens
      .filter((t) => t.valueUsd && t.change24h !== undefined)
      .map((token) => {
        const change24hUsd = (token.valueUsd! * token.change24h!) / 100;
        const performance =
          token.change24h! > 0.01
            ? "gain"
            : token.change24h! < -0.01
              ? "loss"
              : "neutral";

        return {
          token,
          change24hUsd,
          performance,
        };
      });

    const gainers = performances.filter((p) => p.performance === "gain");
    const losers = performances.filter((p) => p.performance === "loss");
    const neutral = performances.filter((p) => p.performance === "neutral");

    const totalGains = gainers.reduce((sum, p) => sum + p.change24hUsd, 0);
    const totalLosses = losers.reduce((sum, p) => sum + p.change24hUsd, 0);
    const netPnL = totalGains + totalLosses;

    const bestPerformer = performances.reduce((best, current) =>
      !best || current.change24hUsd > best.change24hUsd ? current : best,
    );

    const worstPerformer = performances.reduce((worst, current) =>
      !worst || current.change24hUsd < worst.change24hUsd ? current : worst,
    );

    return {
      totalGains,
      totalLosses,
      netPnL,
      bestPerformer,
      worstPerformer,
      gainers: gainers.sort((a, b) => b.change24hUsd - a.change24hUsd),
      losers: losers.sort((a, b) => a.change24hUsd - b.change24hUsd),
      neutral,
    };
  }, [tokens]);

  if (!tokens.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tokens to analyze. Connect a wallet with token holdings to see
            performance metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Gains (24h)
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrencyTiny(analytics.totalGains)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Losses (24h)
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrencyTiny(analytics.totalLosses)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Net P&L (24h)
                </p>
                <p
                  className={`text-2xl font-bold ${
                    analytics.netPnL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrencyTiny(analytics.netPnL)}
                </p>
              </div>
              <DollarSign
                className={`h-8 w-8 ${
                  analytics.netPnL >= 0 ? "text-green-600" : "text-red-600"
                }`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tokens Tracked
                </p>
                <p className="text-2xl font-bold">
                  {tokens.filter((t) => t.valueUsd).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.gainers.length} up, {analytics.losers.length} down
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best and Worst Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Gainers (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.gainers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tokens gained value in the last 24 hours.
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.gainers.slice(0, 5).map((perf, index) => (
                  <TokenPerformanceRow
                    key={`${perf.token.chain}-${perf.token.contractAddress}`}
                    performance={perf}
                    rank={index + 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worst Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Top Losers (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.losers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tokens lost value in the last 24 hours.
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.losers.slice(0, 5).map((perf, index) => (
                  <TokenPerformanceRow
                    key={`${perf.token.chain}-${perf.token.contractAddress}`}
                    performance={perf}
                    rank={index + 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TokenPerformanceRow({
  performance,
  rank,
}: {
  performance: TokenPerformance;
  rank: number;
}) {
  const { token, change24hUsd } = performance;
  const [error, setError] = useState(false);

  const src = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${token.chain}/assets/${token.contractAddress}/logo.png`;
  const initials = (token.symbol ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
          {rank}
        </div>
        <div className="w-8 h-8 rounded-full bg-background overflow-hidden flex items-center justify-center">
          {!error ? (
            <Image
              src={src}
              alt={token.symbol ?? "token"}
              width={32}
              height={32}
              onError={() => setError(true)}
            />
          ) : (
            <span className="text-xs font-bold">{initials}</span>
          )}
        </div>
        <div>
          <div className="font-medium">{token.symbol}</div>
          <div className="text-xs text-muted-foreground">
            {formatCurrencyTiny(token.valueUsd ?? 0)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div
          className={`font-medium ${
            change24hUsd >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatCurrencyTiny(change24hUsd)}
        </div>
        <div
          className={`text-xs ${
            (token.change24h ?? 0) >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatPercentSigned(token.change24h ?? 0)}
        </div>
      </div>
    </div>
  );
}
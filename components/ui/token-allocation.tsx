"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentSigned } from "@/lib/utils";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";

interface TokenAllocationProps {
  tokens: TokenHoldingDTO[];
  isLoading?: boolean;
}

export function TokenAllocation({ tokens, isLoading }: TokenAllocationProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Allocation</CardTitle>
          <CardDescription>Portfolio breakdown by token value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="space-y-1">
                    <div className="h-4 w-16 bg-muted rounded" />
                    <div className="h-3 w-12 bg-muted rounded" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-3 w-12 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Allocation</CardTitle>
          <CardDescription>Portfolio breakdown by token value</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No tokens found</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total portfolio value
  const totalValue = tokens.reduce((sum, token) => sum + (token.valueUsd || 0), 0);

  // Sort tokens by value (descending) and calculate percentages
  const sortedTokens = tokens
    .map((token) => ({
      ...token,
      percentage: totalValue > 0 ? ((token.valueUsd || 0) / totalValue) * 100 : 0,
    }))
    .sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));

  // Group small tokens (< 1%) into "Others"
  const threshold = 1; // 1%
  const significantTokens = sortedTokens.filter((t) => t.percentage >= threshold);
  const smallTokens = sortedTokens.filter((t) => t.percentage < threshold);
  const othersValue = smallTokens.reduce((sum, t) => sum + (t.valueUsd || 0), 0);
  const othersPercentage = totalValue > 0 ? (othersValue / totalValue) * 100 : 0;

  const displayTokens = [...significantTokens];
  if (smallTokens.length > 0) {
    displayTokens.push({
      symbol: "Others",
      name: `${smallTokens.length} tokens`,
      valueUsd: othersValue,
      percentage: othersPercentage,
      priceChange24h: 0,
      balance: "0",
      decimals: 18,
      contractAddress: "",
      chain: "ethereum" as const,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Allocation</CardTitle>
        <CardDescription>
          Portfolio breakdown by token value ({formatCurrency(totalValue)} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayTokens.map((token, index) => (
            <div key={(token.symbol || "unknown") + index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {token.symbol === "Others" ? (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                      •••
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {(token.symbol || "??").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{token.symbol || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {token.symbol === "Others" ? token.name : `${token.percentage.toFixed(1)}%`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">{formatCurrency(token.valueUsd || 0)}</p>
                {token.symbol !== "Others" && (
                  <p className={`text-xs ${
                    (token.priceChange24h || 0) >= 0 ? "text-green-500" : "text-red-500"
                  }`}>
                    {formatPercentSigned(token.priceChange24h || 0)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
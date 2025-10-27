"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";
import { formatCurrencyTiny, formatNumber } from "@/lib/utils";

interface PortfolioAllocationProps {
  tokens: TokenHoldingDTO[];
}

interface AllocationData {
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: any; // Index signature for Recharts compatibility
}

// Color palette for the pie chart
const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export function PortfolioAllocation({ tokens }: PortfolioAllocationProps) {
  const allocationData = useMemo(() => {
    if (!tokens.length) return [];

    // Calculate total portfolio value
    const totalValue = tokens.reduce(
      (sum, token) => sum + (token.valueUsd ?? 0),
      0,
    );

    if (totalValue === 0) return [];

    // Filter tokens with value and sort by value descending
    const validTokens = tokens
      .filter((token) => (token.valueUsd ?? 0) > 0)
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

    // Group small tokens (< 2% of portfolio) into "Others"
    const threshold = totalValue * 0.02;
    const significantTokens = validTokens.filter(
      (token) => (token.valueUsd ?? 0) >= threshold,
    );
    const smallTokens = validTokens.filter(
      (token) => (token.valueUsd ?? 0) < threshold,
    );

    const othersValue = smallTokens.reduce(
      (sum, token) => sum + (token.valueUsd ?? 0),
      0,
    );

    // Create allocation data for significant tokens
    const data: AllocationData[] = significantTokens.map((token, index) => ({
      name: token.name ?? token.symbol ?? "Unknown",
      symbol: token.symbol ?? "?",
      value: token.valueUsd ?? 0,
      percentage: ((token.valueUsd ?? 0) / totalValue) * 100,
      color: COLORS[index % COLORS.length],
    }));

    // Add "Others" if there are small tokens
    if (othersValue > 0) {
      data.push({
        name: "Others",
        symbol: `${smallTokens.length} tokens`,
        value: othersValue,
        percentage: (othersValue / totalValue) * 100,
        color: COLORS[data.length % COLORS.length],
      });
    }

    return data;
  }, [tokens]);

  const totalValue = tokens.reduce(
    (sum, token) => sum + (token.valueUsd ?? 0),
    0,
  );

  if (!tokens.length || totalValue === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tokens with value to display allocation. Connect a wallet with
            token holdings to see the breakdown.
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.symbol}</p>
          <p className="text-sm">
            <span className="font-medium">
              {formatCurrencyTiny(data.value)}
            </span>
            <span className="text-muted-foreground ml-2">
              ({formatNumber(data.percentage, { maximumFractionDigits: 1 })}%)
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.payload.symbol}</span>
            <span className="text-muted-foreground ml-auto">
              {formatNumber(entry.payload.percentage, {
                maximumFractionDigits: 1,
              })}
              %
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Allocation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution by value • Total: {formatCurrencyTiny(totalValue)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{allocationData.length}</p>
            <p className="text-xs text-muted-foreground">Assets</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {allocationData.length > 0
                ? formatNumber(allocationData[0].percentage, {
                    maximumFractionDigits: 1,
                  })
                : "0"}
              %
            </p>
            <p className="text-xs text-muted-foreground">Largest Position</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {formatNumber(
                allocationData.reduce(
                  (sum, item) => (item.percentage >= 10 ? sum + 1 : sum),
                  0,
                ),
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Major Holdings (≥10%)
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {formatNumber(
                100 -
                  (allocationData.find((item) => item.name === "Others")
                    ?.percentage ?? 0),
                { maximumFractionDigits: 1 },
              )}
              %
            </p>
            <p className="text-xs text-muted-foreground">Top Holdings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

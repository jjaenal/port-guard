"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";
import { formatCurrencyTiny } from "@/lib/utils";

export type SeriesPoint = { t: number; v: number };

interface PortfolioChartProps {
  points: SeriesPoint[];
  height?: number;
}

export function PortfolioChart({ points, height = 200 }: PortfolioChartProps) {
  const data = useMemo(() => {
    return (points ?? []).map((p) => ({ t: p.t, v: p.v }));
  }, [points]);

  const formatXTick = (tick: number) => {
    const d = new Date(tick);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const formatXLabel = (tick: number) => {
    const d = new Date(tick);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatYTick = (val: number) => formatCurrencyTiny(val);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
          <defs>
            <linearGradient id="pgValueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="t" tickFormatter={formatXTick} stroke="#6b7280" />
          <YAxis tickFormatter={formatYTick} stroke="#6b7280" width={80} />
          <Tooltip
            formatter={(value) => [formatCurrencyTiny(Number(value)), "Value"]}
            labelFormatter={(label) => formatXLabel(Number(label))}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="#3b82f6"
            fill="url(#pgValueGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

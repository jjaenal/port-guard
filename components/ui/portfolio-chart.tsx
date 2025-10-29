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
    <div
      className="min-h-[220px] sm:min-h-[260px] touch-pan-y"
      style={{ width: "100%", height }}
    >
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
          <YAxis tickFormatter={formatYTick} stroke="#6b7280" width={64} />
          <Tooltip
            content={
              <PortfolioTooltip data={data} formatXLabel={formatXLabel} />
            }
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
type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
  data: { t: number; v: number }[];
  formatXLabel: (tick: number) => string;
};

function PortfolioTooltip({
  active,
  payload,
  label,
  data,
  formatXLabel,
}: TooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) {
    return null;
  }
  const idx = data.findIndex((d) => d.t === label);
  const curr = Number(payload[0].value ?? 0);
  const prev = idx > 0 ? Number(data[idx - 1].v ?? 0) : null;
  const delta = prev !== null ? curr - prev : null;
  const pct = prev !== null && prev !== 0 ? (delta! / prev) * 100 : null;

  return (
    <div className="rounded border bg-card/95 backdrop-blur p-2 text-xs shadow-sm">
      <div className="text-[10px] text-muted-foreground mb-0.5">
        {formatXLabel(Number(label))}
      </div>
      <div className="font-medium">{formatCurrencyTiny(curr)}</div>
      {delta !== null && (
        <div
          className={`mt-0.5 ${delta >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          {(delta >= 0 ? "+" : "") + formatCurrencyTiny(Math.abs(delta))}
          {pct !== null ? ` (${pct.toFixed(2)}%)` : ""}
        </div>
      )}
    </div>
  );
}

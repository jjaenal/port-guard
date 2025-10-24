"use client";

import React, { useMemo } from "react";
import type { SeriesPoint } from "@/lib/hooks/usePortfolioSeries";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type Props = {
  points: SeriesPoint[];
  height?: number;
};

/**
 * Custom tooltip component for the chart
 */
const CustomTooltip = ({ 
  active, 
  payload, 
  label 
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length && label) {
    return (
      <div className="bg-white p-2 border rounded shadow-sm text-xs">
        <p className="font-medium">{new Date(label).toLocaleDateString()}</p>
        <p className="text-sm">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

/**
 * Komponen chart portofolio menggunakan Recharts.
 * Menampilkan area chart dengan tooltip dan grid.
 */
export function PortfolioChart({ points, height = 200 }: Props) {
  // Format data untuk Recharts
  const chartData = useMemo(() => {
    if (!points || points.length === 0) return [];
    
    return points.map((point) => ({
      date: new Date(point.t),
      value: point.v,
    }));
  }, [points]);

  if (!points || points.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No data available</div>
    );
  }

  // Hitung perubahan persentase
  const firstValue = chartData[0]?.value || 0;
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const changePercent = firstValue > 0 
    ? ((lastValue - firstValue) / firstValue) * 100 
    : 0;
  
  // Tentukan warna berdasarkan perubahan
  const chartColor = changePercent >= 0 ? "#10b981" : "#ef4444";
       
  // Format functions untuk axes
  const formatXAxis = (tickItem: Date) => {
    return tickItem.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  
  const formatYAxis = (tickItem: number) => {
    return tickItem >= 1000 ? `$${(tickItem / 1000).toFixed(1)}k` : `$${tickItem}`;
  };

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">
          {formatCurrency(lastValue)}
          <span 
            className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
              changePercent >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis} 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tickFormatter={formatYAxis} 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

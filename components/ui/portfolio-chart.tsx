"use client";

import React from "react";
import type { SeriesPoint } from "@/lib/hooks/usePortfolioSeries";

type Props = {
  points: SeriesPoint[];
  width?: number;
  height?: number;
};

/**
 * Komponen SVG sederhana untuk menampilkan line chart.
 * Fokus pada performa dan tanpa dependency tambahan.
 */
export function PortfolioChart({ points, width = 600, height = 200 }: Props) {
  if (!points || points.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No data available</div>
    );
  }

  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.v);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 8;

  const scaleX = (x: number) => {
    const r = maxX === minX ? 0 : (x - minX) / (maxX - minX);
    return pad + r * (width - 2 * pad);
  };
  const scaleY = (y: number) => {
    const r = maxY === minY ? 0 : (y - minY) / (maxY - minY);
    // Invert Y for SVG (0 at top)
    return height - pad - r * (height - 2 * pad);
  };

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.t)},${scaleY(p.v)}`)
    .join(" ");

  return (
    <svg width={width} height={height} role="img" aria-label="Portfolio chart">
      {/* Background grid lines */}
      <line
        x1={pad}
        x2={width - pad}
        y1={height - pad}
        y2={height - pad}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      <line
        x1={pad}
        x2={pad}
        y1={pad}
        y2={height - pad}
        stroke="#e5e7eb"
        strokeWidth={1}
      />

      {/* Area fill for subtle effect */}
      <path
        d={`${pathD} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`}
        fill="#6366f11a"
      />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2} />

      {/* Min/Max labels */}
      <text x={pad} y={pad + 12} className="text-[10px] fill-muted-foreground">
        {Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(minY)}
      </text>
      <text
        x={pad}
        y={height - 2}
        className="text-[10px] fill-muted-foreground"
      >
        {Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(maxY)}
      </text>
    </svg>
  );
}

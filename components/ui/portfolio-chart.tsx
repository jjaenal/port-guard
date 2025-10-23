"use client";

import React, { useMemo, useState } from "react";
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

  const pathD = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.t)},${scaleY(p.v)}`)
        .join(" "),
    [points, minX, maxX, minY, maxY],
  );

  // Tooltip state
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const handleMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const rect = (e.target as SVGElement)
      .closest("svg")
      ?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = e.clientX - rect.left;
    const ratio = (offsetX - pad) / (width - 2 * pad);
    const clamped = Math.max(0, Math.min(1, ratio));
    const approxX = minX + clamped * (maxX - minX);

    // Temukan titik terdekat berdasarkan timestamp
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].t - approxX);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }

    setHoverIdx(nearestIdx);
    setHoverX(scaleX(points[nearestIdx].t));
  };
  const handleMouseLeave: React.MouseEventHandler<SVGSVGElement> = () => {
    setHoverIdx(null);
    setHoverX(null);
  };

  const fmtCurrency = (n: number) =>
    Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      n,
    );
  const fmtDate = (t: number) => new Date(t).toLocaleString();

  const tooltipPoint = hoverIdx != null ? points[hoverIdx] : null;
  const tooltipX = hoverX ?? 0;
  const tooltipY = tooltipPoint ? scaleY(tooltipPoint.v) : 0;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="Portfolio chart"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: "crosshair" }}
    >
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
        {fmtCurrency(minY)}
      </text>
      <text
        x={pad}
        y={height - 2}
        className="text-[10px] fill-muted-foreground"
      >
        {fmtCurrency(maxY)}
      </text>

      {/* Tooltip overlay */}
      {tooltipPoint && (
        <g>
          {/* Vertical guide */}
          <line
            x1={tooltipX}
            x2={tooltipX}
            y1={pad}
            y2={height - pad}
            stroke="#94a3b8"
            strokeDasharray="3 3"
          />
          {/* Point marker */}
          <circle cx={tooltipX} cy={tooltipY} r={3} fill="#6366f1" />
          {/* Tooltip box */}
          <rect
            x={Math.min(Math.max(tooltipX + 8, pad), width - 140)}
            y={Math.max(tooltipY - 30, pad)}
            width={132}
            height={28}
            rx={4}
            fill="#ffffff"
            stroke="#e5e7eb"
          />
          <text
            x={Math.min(Math.max(tooltipX + 12, pad + 4), width - 132)}
            y={Math.max(tooltipY - 14, pad + 12)}
            className="text-[10px] fill-slate-700"
          >
            {fmtDate(tooltipPoint.t)}
          </text>
          <text
            x={Math.min(Math.max(tooltipX + 12, pad + 4), width - 132)}
            y={Math.max(tooltipY - 2, pad + 24)}
            className="text-[10px] fill-slate-800"
          >
            {fmtCurrency(tooltipPoint.v)}
          </text>
        </g>
      )}
    </svg>
  );
}

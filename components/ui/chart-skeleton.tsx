"use client";
import React from "react";

export function ChartSkeleton() {
  return (
    <div className="w-full min-h-[240px] sm:min-h-[320px] rounded-lg border border-muted bg-muted/30 overflow-hidden">
      <div className="h-10 border-b border-muted flex items-center px-3 gap-3">
        <div className="h-6 w-24 bg-muted-foreground/20 rounded animate-pulse" />
        <div className="h-6 w-12 bg-muted-foreground/20 rounded animate-pulse" />
        <div className="h-6 w-12 bg-muted-foreground/20 rounded animate-pulse" />
        <div className="h-6 w-12 bg-muted-foreground/20 rounded animate-pulse" />
      </div>
      <div className="p-3 sm:p-4">
        <div className="h-[180px] sm:h-[260px] w-full bg-muted-foreground/10 rounded animate-pulse" />
      </div>
    </div>
  );
}
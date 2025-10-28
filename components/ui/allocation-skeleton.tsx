"use client";
import React from "react";

export function AllocationSkeleton() {
  return (
    <div className="w-full rounded-lg border border-muted bg-muted/30 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-28 bg-muted-foreground/20 rounded animate-pulse" />
        <div className="h-6 w-16 bg-muted-foreground/20 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-muted-foreground/20 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-2/3 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
            <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
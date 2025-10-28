"use client";

import React from "react";

type CacheBadgeProps = {
  visible: boolean;
  title?: string;
  className?: string;
  children?: React.ReactNode;
};

export function CacheBadge({
  visible,
  title,
  className,
  children = "Cached",
}: CacheBadgeProps) {
  if (!visible) return null;
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground mr-2 ${className ?? ""}`}
      title={title}
    >
      {children}
    </span>
  );
}
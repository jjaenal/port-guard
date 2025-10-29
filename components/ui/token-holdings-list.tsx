"use client";
import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";
import { formatCurrencyTiny, formatPercentSigned } from "@/lib/utils";

type Props = { tokens: TokenHoldingDTO[] };

export function TokenHoldingsList({ tokens }: Props) {
  const params = useSearchParams();
  const chainParam = params?.get("chain") ?? "all";
  const hideTinyParam = params?.get("hideTiny") ?? null;
  const filtered = useMemo(() => {
    const hideTiny = hideTinyParam === "1";
    return tokens.filter((t) => {
      const chainOk = chainParam === "all" ? true : t.chain === chainParam;
      const smallOk = hideTiny ? (t.valueUsd ?? Infinity) >= 1 : true;
      return chainOk && smallOk;
    });
  }, [tokens, chainParam, hideTinyParam]);

  const totalValue = useMemo(
    () => filtered.reduce((sum, t) => sum + (t.valueUsd ?? 0), 0),
    [filtered],
  );

  return (
    <div className="sm:hidden space-y-2">
      {filtered.map((t) => {
        const value = t.valueUsd ?? 0;
        const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
        const change = t.change24h ?? null;
        return (
          <div
            key={`${t.chain}:${t.contractAddress}`}
            className="rounded-lg border bg-card p-3 flex items-start justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {t.symbol?.[0] ?? "?"}
              </div>
              <div>
                <div className="text-sm font-medium leading-tight">
                  {t.symbol ?? t.name ?? t.contractAddress.slice(0, 6)}
                </div>
                <div className="text-xs text-muted-foreground leading-tight">
                  {t.name ?? "Unknown Token"}
                </div>
                <div className="mt-1 text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                  <span className="uppercase">{t.chain}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium">
                {formatCurrencyTiny(value)}
              </div>
              <div className="text-xs text-muted-foreground">
                {Number(t.formatted ?? "0").toFixed(2)} {t.symbol ?? ""}
              </div>
              <div
                className={`text-xs ${change !== null ? (change >= 0 ? "text-green-600" : "text-red-600") : "text-muted-foreground"}`}
              >
                {change !== null ? formatPercentSigned(change) : "-"}
                <span className="ml-2 text-muted-foreground">
                  {pct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

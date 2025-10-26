"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  formatNumber,
  formatCurrencyTiny,
  formatPercentSigned,
} from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

function TokenAvatar({ token }: { token: TokenHoldingDTO }) {
  const [error, setError] = useState(false);
  const initials = (token.symbol ?? "?").slice(0, 2).toUpperCase();
  const src = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${token.chain}/assets/${token.contractAddress}/logo.png`;
  return (
    <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex items-center justify-center text-[10px] font-bold">
      {!error ? (
        <Image
          src={src}
          alt={token.symbol ?? "token"}
          width={24}
          height={24}
          onError={() => setError(true)}
        />
      ) : (
        <span className="uppercase">{initials}</span>
      )}
    </div>
  );
}

export function TokenHoldingsTable({ tokens }: { tokens: TokenHoldingDTO[] }) {
  // Sorting state and helpers
  const [sortKey, setSortKey] = useState<
    "valueUsd" | "balance" | "token" | "change24h"
  >(() => {
    try {
      const sk =
        typeof window !== "undefined"
          ? localStorage.getItem("tokenSortKey")
          : null;
      return sk === "valueUsd" ||
        sk === "balance" ||
        sk === "token" ||
        sk === "change24h"
        ? (sk as "valueUsd" | "balance" | "token" | "change24h")
        : "valueUsd";
    } catch {
      return "valueUsd";
    }
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
    try {
      const sd =
        typeof window !== "undefined"
          ? localStorage.getItem("tokenSortDir")
          : null;
      return sd === "asc" || sd === "desc" ? (sd as "asc" | "desc") : "desc";
    } catch {
      return "desc";
    }
  });
  // Filters
  const [chainFilter, setChainFilter] = useState<
    "all" | "ethereum" | "polygon"
  >(() => {
    try {
      const cf =
        typeof window !== "undefined"
          ? localStorage.getItem("tokenChainFilter")
          : null;
      return cf === "all" || cf === "ethereum" || cf === "polygon"
        ? (cf as "all" | "ethereum" | "polygon")
        : "all";
    } catch {
      return "all";
    }
  });
  const [search] = useState<string>(() => {
    try {
      const sq =
        typeof window !== "undefined"
          ? localStorage.getItem("tokenSearchQuery")
          : null;
      return typeof sq === "string" ? sq : "";
    } catch {
      return "";
    }
  });
  const [hideSmall, setHideSmall] = useState<boolean>(() => {
    try {
      const hs =
        typeof window !== "undefined"
          ? localStorage.getItem("tokenHideSmall")
          : null;
      return hs === "true" ? true : hs === "false" ? false : false;
    } catch {
      return false;
    }
  });
  const [change24hFilter] = useState<"all" | "up" | "down">(() => {
    try {
      const f =
        typeof window !== "undefined"
          ? localStorage.getItem("tokenChange24hFilter")
          : null;
      return f === "all" || f === "up" || f === "down"
        ? (f as "all" | "up" | "down")
        : "all";
    } catch {
      return "all";
    }
  });

  // Total value for portfolio percentage (use full tokens list, not filtered)
  // Removed unused totalValue to satisfy lint

  // Load persisted preferences
  // Removed useEffect that synchronously set multiple states; initialization now reads from localStorage lazily

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem("tokenSortKey", sortKey);
      localStorage.setItem("tokenSortDir", sortDir);
      localStorage.setItem("tokenChainFilter", chainFilter);
      localStorage.setItem("tokenChange24hFilter", change24hFilter);
      localStorage.setItem("tokenSearchQuery", search);
      localStorage.setItem("tokenHideSmall", String(hideSmall));
    } catch {}
  }, [sortKey, sortDir, chainFilter, change24hFilter, search, hideSmall]);

  const filtered = tokens.filter((t) => {
    const chainOk = chainFilter === "all" ? true : t.chain === chainFilter;
    const q = search.trim().toLowerCase();
    const text = `${t.symbol ?? ""} ${t.name ?? ""}`.toLowerCase();
    const searchOk = q ? text.includes(q) : true;
    const smallOk = hideSmall ? (t.valueUsd ?? Infinity) >= 1 : true;
    return chainOk && searchOk && smallOk;
  });

  // Total portfolio value (across all tokens) for percentage calc
  const totalPortfolioUsd = tokens.reduce(
    (sum, t) => sum + (t.valueUsd ?? 0),
    0,
  );

  const sortedTokens = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "valueUsd") {
      const av = a.valueUsd ?? 0;
      const bv = b.valueUsd ?? 0;
      return av === bv ? 0 : av > bv ? 1 * dir : -1 * dir;
    }
    if (sortKey === "balance") {
      const av = parseFloat(a.balance ?? "0");
      const bv = parseFloat(b.balance ?? "0");
      return av === bv ? 0 : av > bv ? 1 * dir : -1 * dir;
    }
    if (sortKey === "token") {
      const an = (a.symbol ?? "").toLowerCase();
      const bn = (b.symbol ?? "").toLowerCase();
      return an === bn ? 0 : an > bn ? 1 * dir : -1 * dir;
    }
    if (sortKey === "change24h") {
      const av = a.change24h ?? 0;
      const bv = b.change24h ?? 0;
      return av === bv ? 0 : av > bv ? 1 * dir : -1 * dir;
    }
    return 0;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="text-xs text-muted-foreground">Sort by</div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            className={`px-2 py-1 rounded border text-xs ${sortKey === "valueUsd" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("valueUsd")}
            aria-pressed={sortKey === "valueUsd"}
          >
            Value (USD)
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${sortKey === "balance" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("balance")}
            aria-pressed={sortKey === "balance"}
          >
            Balance
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${sortKey === "token" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("token")}
            aria-pressed={sortKey === "token"}
          >
            Token
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${sortKey === "change24h" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("change24h")}
            aria-pressed={sortKey === "change24h"}
          >
            24h Change
          </button>
          <button
            className="px-2 py-1 rounded border text-xs"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            aria-label="Toggle sort direction"
            aria-pressed={sortDir === "desc"}
          >
            {sortDir === "desc" ? "Desc" : "Asc"}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            className={`px-2 py-1 rounded border text-xs ${chainFilter === "all" ? "bg-muted" : ""}`}
            onClick={() => setChainFilter("all")}
          >
            All Chains
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${chainFilter === "ethereum" ? "bg-muted" : ""}`}
            onClick={() => setChainFilter("ethereum")}
          >
            Ethereum
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${chainFilter === "polygon" ? "bg-muted" : ""}`}
            onClick={() => setChainFilter("polygon")}
          >
            Polygon
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${hideSmall ? "bg-muted" : ""}`}
            onClick={() => setHideSmall((v) => !v)}
            aria-pressed={hideSmall}
            aria-label="Toggle hide small balances"
          >
            Hide &lt;$1
          </button>
        </div>
      </div>

      {sortedTokens.length === 0 ? (
        <p className="text-muted-foreground">No ERC-20 tokens detected.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead className="hidden md:table-cell">Chain</TableHead>
              <TableHead className="hidden sm:table-cell">Balance</TableHead>
              <TableHead className="hidden md:table-cell">
                Price (USD)
              </TableHead>
              <TableHead>Value (USD)</TableHead>
              <TableHead className="hidden md:table-cell">24h Change</TableHead>
              <TableHead className="w-[120px]">Portfolio %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTokens.map((t) => {
              const percent =
                totalPortfolioUsd > 0
                  ? ((t.valueUsd ?? 0) / totalPortfolioUsd) * 100
                  : 0;
              const change = t.change24h;
              const changeClass =
                change === undefined
                  ? ""
                  : change >= 0
                    ? "text-green-600"
                    : "text-red-600";
              return (
                <TableRow key={`${t.chain}-${t.contractAddress}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TokenAvatar token={t} />
                      <div>
                        <div className="font-medium">{t.symbol ?? "?"}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.name ?? t.contractAddress.slice(0, 6) + "..."}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize hidden md:table-cell">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.chain === "ethereum"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {t.chain === "ethereum" ? "Ethereum" : "Polygon"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {t.formatted
                      ? formatNumber(Number(t.formatted), {
                          maximumFractionDigits: 6,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {t.priceUsd ? formatCurrencyTiny(t.priceUsd) : "-"}
                  </TableCell>
                  <TableCell>
                    {t.valueUsd ? formatCurrencyTiny(t.valueUsd) : "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {change === undefined ? (
                      "-"
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 ${changeClass}`}
                      >
                        {change > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : change < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {formatPercentSigned(change)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-[120px]">
                    {formatNumber(percent, { maximumFractionDigits: 2 })}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableCaption>
            Showing {sortedTokens.length} ERC-20{" "}
            {chainFilter !== "all" ? chainFilter : "tokens"} on Ethereum &
            Polygon. Total portfolio value used for %.
          </TableCaption>
        </Table>
      )}
    </div>
  );
}

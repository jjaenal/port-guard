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
      const sk = localStorage.getItem("tokenSortKey");
      if (
        sk === "valueUsd" ||
        sk === "balance" ||
        sk === "token" ||
        sk === "change24h"
      )
        return sk as any;
    } catch {}
    return "valueUsd";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
    try {
      const sd = localStorage.getItem("tokenSortDir");
      if (sd === "asc" || sd === "desc") return sd;
    } catch {}
    return "desc";
  });
  // Filters
  const [chainFilter, setChainFilter] = useState<
    "all" | "ethereum" | "polygon"
  >(() => {
    try {
      const cf = localStorage.getItem("tokenChainFilter");
      if (cf === "all" || cf === "ethereum" || cf === "polygon") return cf;
    } catch {}
    return "all";
  });
  const [change24hFilter, setChange24hFilter] = useState<"all" | "up" | "down">(
    () => {
      try {
        const f = localStorage.getItem("tokenChange24hFilter");
        if (f === "all" || f === "up" || f === "down") return f as any;
      } catch {}
      return "all";
    },
  );
  const [search, setSearch] = useState<string>(() => {
    try {
      const sq = localStorage.getItem("tokenSearchQuery");
      if (typeof sq === "string") return sq;
    } catch {}
    return "";
  });

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem("tokenSortKey", sortKey);
      localStorage.setItem("tokenSortDir", sortDir);
      localStorage.setItem("tokenChainFilter", chainFilter);
      localStorage.setItem("tokenChange24hFilter", change24hFilter);
      localStorage.setItem("tokenSearchQuery", search);
    } catch {}
  }, [sortKey, sortDir, chainFilter, change24hFilter, search]);

  const filtered = tokens.filter((t) => {
    const chainOk = chainFilter === "all" ? true : t.chain === chainFilter;
    const q = search.trim().toLowerCase();
    const text = `${t.symbol ?? ""} ${t.name ?? ""}`.toLowerCase();
    const searchOk = q ? text.includes(q) : true;
    const changeOk =
      change24hFilter === "all"
        ? true
        : change24hFilter === "up"
          ? (t.change24h ?? 0) > 0
          : (t.change24h ?? 0) < 0;
    return chainOk && searchOk && changeOk;
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
      const ab = Number(a.formatted ?? 0);
      const bb = Number(b.formatted ?? 0);
      return ab === bb ? 0 : ab > bb ? 1 * dir : -1 * dir;
    }
    if (sortKey === "change24h") {
      const av =
        a.change24h ??
        (sortDir === "asc"
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY);
      const bv =
        b.change24h ??
        (sortDir === "asc"
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY);
      return av === bv ? 0 : av > bv ? 1 * dir : -1 * dir;
    }
    // token label sort
    const at = (a.symbol ?? a.name ?? "").toLowerCase();
    const bt = (b.symbol ?? b.name ?? "").toLowerCase();
    return at.localeCompare(bt) * dir;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted-foreground">Sort by</div>
        <div className="flex items-center gap-2">
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

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              className={`px-2 py-1 rounded border text-xs ${change24hFilter === "all" ? "bg-muted" : ""}`}
              onClick={() => setChange24hFilter("all")}
            >
              24h All
            </button>
            <button
              className={`px-2 py-1 rounded border text-xs ${change24hFilter === "up" ? "bg-muted" : ""}`}
              onClick={() => setChange24hFilter("up")}
            >
              24h Up
            </button>
            <button
              className={`px-2 py-1 rounded border text-xs ${change24hFilter === "down" ? "bg-muted" : ""}`}
              onClick={() => setChange24hFilter("down")}
            >
              24h Down
            </button>
          </div>
          <input
            className="px-2 py-1 rounded border text-xs w-40 bg-background"
            placeholder="Search token"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                      <span className={changeClass}>
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

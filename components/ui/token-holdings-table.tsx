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
import { formatNumber, formatCurrencyTiny } from "@/lib/utils";

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
  const [sortKey, setSortKey] = useState<"valueUsd" | "balance" | "token" | "priceChange24h" | "portfolioPercent">(
    "valueUsd",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Filters
  const [chainFilter, setChainFilter] = useState<
    "all" | "ethereum" | "polygon"
  >("all");
  const [search, setSearch] = useState<string>("");
  const [hideSmall, setHideSmall] = useState<boolean>(false);

  // Total value for portfolio percentage (use full tokens list, not filtered)
  const totalValue = (tokens ?? []).reduce((sum, t) => sum + (t.valueUsd ?? 0), 0);

  // Load persisted preferences
  useEffect(() => {
    try {
      const sk = localStorage.getItem("tokenSortKey");
      const sd = localStorage.getItem("tokenSortDir");
      const cf = localStorage.getItem("tokenChainFilter");
      const sq = localStorage.getItem("tokenSearchQuery");
      const hs = localStorage.getItem("tokenHideSmall");
      if (
        sk === "valueUsd" ||
        sk === "balance" ||
        sk === "token" ||
        sk === "priceChange24h" ||
        sk === "portfolioPercent"
      )
        setSortKey(sk as any);
      if (sd === "asc" || sd === "desc") setSortDir(sd as any);
      if (cf === "all" || cf === "ethereum" || cf === "polygon")
        setChainFilter(cf as any);
      if (typeof sq === "string") setSearch(sq);
      if (hs === "true" || hs === "false") setHideSmall(hs === "true");
    } catch {}
  }, []);

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem("tokenSortKey", sortKey);
      localStorage.setItem("tokenSortDir", sortDir);
      localStorage.setItem("tokenChainFilter", chainFilter);
      localStorage.setItem("tokenSearchQuery", search);
      localStorage.setItem("tokenHideSmall", String(hideSmall));
    } catch {}
  }, [sortKey, sortDir, chainFilter, search]);

  const filtered = tokens.filter((t) => {
    const chainOk = chainFilter === "all" ? true : t.chain === chainFilter;
    const q = search.trim().toLowerCase();
    const text = `${t.symbol ?? ""} ${t.name ?? ""}`.toLowerCase();
    const searchOk = q ? text.includes(q) : true;
    const smallOk = hideSmall ? ((t.valueUsd ?? Infinity) >= 1) : true;
    return chainOk && searchOk && smallOk;
  });

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
    if (sortKey === "priceChange24h") {
      const ac = a.priceChange24h ?? 0;
      const bc = b.priceChange24h ?? 0;
      return ac === bc ? 0 : ac > bc ? 1 * dir : -1 * dir;
    }
    if (sortKey === "portfolioPercent") {
      const ap = totalValue ? (a.valueUsd ?? 0) / totalValue : 0;
      const bp = totalValue ? (b.valueUsd ?? 0) / totalValue : 0;
      return ap === bp ? 0 : ap > bp ? 1 * dir : -1 * dir;
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
            className={`px-2 py-1 rounded border text-xs ${sortKey === "priceChange24h" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("priceChange24h")}
            aria-pressed={sortKey === "priceChange24h"}
          >
            24h Change
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${sortKey === "portfolioPercent" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("portfolioPercent")}
            aria-pressed={sortKey === "portfolioPercent"}
          >
            Portfolio %
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
          <button
            className={`px-2 py-1 rounded border text-xs ${hideSmall ? "bg-muted" : ""}`}
            onClick={() => setHideSmall((v) => !v)}
            aria-pressed={hideSmall}
            aria-label="Toggle hide small balances"
          >
            Hide <$1
          </button>
        </div>
        <input
          className="px-2 py-1 rounded border text-xs w-40 bg-background"
          placeholder="Search token"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {sortedTokens.length === 0 ? (
        <p className="text-muted-foreground">No ERC-20 tokens detected.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Chain</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Price (USD)</TableHead>
              <TableHead>24h Change</TableHead>
              <TableHead>Value (USD)</TableHead>
              <TableHead>Portfolio %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTokens.map((t) => (
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
                <TableCell className="capitalize">
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
                <TableCell>
                  {t.formatted
                    ? formatNumber(Number(t.formatted), {
                        maximumFractionDigits: 6,
                      })
                    : "-"}
                </TableCell>
                <TableCell>
                  {t.priceUsd ? formatCurrencyTiny(t.priceUsd) : "-"}
                </TableCell>
                <TableCell>
                  {t.priceChange24h !== undefined ? (
                    <span
                      className={`font-medium ${
                        t.priceChange24h >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {t.priceChange24h >= 0 ? "+" : ""}
                      {t.priceChange24h.toFixed(2)}%
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {t.valueUsd ? formatCurrencyTiny(t.valueUsd) : "-"}
                </TableCell>
                <TableCell>
                  {totalValue > 0 && t.valueUsd !== undefined ? (
                    <span className="text-xs font-medium">
                      {(((t.valueUsd ?? 0) / totalValue) * 100).toFixed(2)}%
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption>
            Showing {sortedTokens.length} ERC-20{" "}
            {chainFilter !== "all" ? chainFilter : "tokens"} on Ethereum &
            Polygon
          </TableCaption>
        </Table>
      )}
    </div>
  );
}

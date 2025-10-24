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

function EmptyState({
  hasTokens,
  hasFilters,
  onClearFilters,
}: {
  hasTokens: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (!hasTokens) {
    // No tokens at all
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No Tokens Found</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          No ERC-20 tokens detected in this wallet. Connect a wallet with token
          holdings or check if the address is correct.
        </p>
      </div>
    );
  }

  if (hasFilters) {
    // Has tokens but filtered out
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No Matching Tokens</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-md">
          No tokens match your current filters. Try adjusting your search or
          filter criteria.
        </p>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    );
  }

  return null;
}

export function TokenHoldingsTable({ tokens }: { tokens: TokenHoldingDTO[] }) {
  // Sorting state and helpers
  const [sortKey, setSortKey] = useState<
    "valueUsd" | "balance" | "token" | "priceChange24h" | "portfolioPercent"
  >("valueUsd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Filters
  const [chainFilter, setChainFilter] = useState<
    "all" | "ethereum" | "polygon"
  >("all");
  const [search, setSearch] = useState<string>("");
  const [hideSmall, setHideSmall] = useState<boolean>(false);

  // Total value for portfolio percentage (use full tokens list, not filtered)
  const totalValue = (tokens ?? []).reduce(
    (sum, t) => sum + (t.valueUsd ?? 0),
    0
  );

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
    const smallOk = hideSmall ? (t.valueUsd ?? Infinity) >= 1 : true;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
        <div className="text-xs text-muted-foreground">Sort by</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`px-2 py-1 rounded border text-xs ${sortKey === "valueUsd" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("valueUsd")}
            aria-pressed={sortKey === "valueUsd"}
          >
            Value
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
            24h
          </button>
          <button
            className={`px-2 py-1 rounded border text-xs ${sortKey === "portfolioPercent" ? "bg-muted" : ""}`}
            onClick={() => setSortKey("portfolioPercent")}
            aria-pressed={sortKey === "portfolioPercent"}
          >
            %
          </button>
          <button
            className="px-2 py-1 rounded border text-xs"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            aria-label="Toggle sort direction"
            aria-pressed={sortDir === "desc"}
          >
            {sortDir === "desc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`px-2 py-1 rounded border text-xs ${chainFilter === "all" ? "bg-muted" : ""}`}
            onClick={() => setChainFilter("all")}
          >
            All
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
        <input
          className="px-2 py-1 rounded border text-xs w-full sm:w-40 bg-background"
          placeholder="Search token"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {sortedTokens.length === 0 ? (
        <EmptyState
          hasTokens={tokens.length > 0}
          hasFilters={search.length > 0 || chainFilter !== "all" || hideSmall}
          onClearFilters={() => {
            setSearch("");
            setChainFilter("all");
            setHideSmall(false);
          }}
        />
      ) : (
        <>
          {/* Mobile Card Layout (< 768px) */}
          <div className="block md:hidden space-y-3">
            {sortedTokens.map((t) => (
              <div
                key={`${t.chain}-${t.contractAddress}`}
                className="bg-card border rounded-lg p-4 space-y-3"
              >
                {/* Header: Token + Chain */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenAvatar token={t} />
                    <div>
                      <div className="font-medium">{t.symbol ?? "?"}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.name ?? t.contractAddress.slice(0, 6) + "..."}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.chain === "ethereum"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {t.chain === "ethereum" ? "ETH" : "POLY"}
                  </span>
                </div>

                {/* Main Info: Value + Change */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">
                      {t.valueUsd ? formatCurrencyTiny(t.valueUsd) : "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.formatted
                        ? formatNumber(Number(t.formatted), {
                            maximumFractionDigits: 4,
                          })
                        : "-"}{" "}
                      {t.symbol}
                    </div>
                  </div>
                  <div className="text-right">
                    {t.priceChange24h !== undefined ? (
                      <div
                        className={`font-medium ${
                          t.priceChange24h >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {t.priceChange24h >= 0 ? "+" : ""}
                        {t.priceChange24h.toFixed(2)}%
                      </div>
                    ) : (
                      <div>-</div>
                    )}
                    {totalValue > 0 && t.valueUsd !== undefined ? (
                      <div className="text-xs text-muted-foreground">
                        {(((t.valueUsd ?? 0) / totalValue) * 100).toFixed(1)}%
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet Simplified Table (768px - 1024px) */}
          <div className="hidden md:block lg:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>24h Change</TableHead>
                  <TableHead>Value (USD)</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTokens.map((t) => (
                  <TableRow key={`${t.chain}-${t.contractAddress}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TokenAvatar token={t} />
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {t.symbol ?? "?"}
                            <span
                              className={`px-1 py-0.5 rounded text-xs ${
                                t.chain === "ethereum"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {t.chain === "ethereum" ? "ETH" : "POLY"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.name ?? t.contractAddress.slice(0, 6) + "..."}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.formatted
                        ? formatNumber(Number(t.formatted), {
                            maximumFractionDigits: 4,
                          })
                        : "-"}
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
                          {(((t.valueUsd ?? 0) / totalValue) * 100).toFixed(1)}%
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
                {chainFilter !== "all" ? chainFilter : "tokens"}
              </TableCaption>
            </Table>
          </div>

          {/* Desktop Full Table (> 1024px) */}
          <div className="hidden lg:block">
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
          </div>
        </>
      )}
    </div>
  );
}

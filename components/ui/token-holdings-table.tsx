"use client";

import Image from "next/image";
import { useState } from "react";
import type { TokenHolding } from "@/lib/blockchain/balances";
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

function TokenAvatar({ token }: { token: TokenHolding }) {
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

export function TokenHoldingsTable({ tokens }: { tokens: TokenHolding[] }) {
  if (!tokens || tokens.length === 0) {
    return <p className="text-muted-foreground">No ERC-20 tokens detected.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Token</TableHead>
          <TableHead>Chain</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Price (USD)</TableHead>
          <TableHead>Value (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tokens.map((t) => (
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
            <TableCell className="capitalize">{t.chain}</TableCell>
            <TableCell>
              {t.formatted ? formatNumber(Number(t.formatted), { maximumFractionDigits: 6 }) : "-"}
            </TableCell>
            <TableCell>{t.priceUsd ? formatCurrencyTiny(t.priceUsd) : "-"}</TableCell>
            <TableCell>{t.valueUsd ? formatCurrencyTiny(t.valueUsd) : "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableCaption>Showing ERC-20 balances on Ethereum & Polygon</TableCaption>
    </Table>
  );
}
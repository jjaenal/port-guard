"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";

export function useTokenHoldings(addressOverride?: string) {
  const { address } = useAccount();
  const effectiveAddress = (addressOverride ?? address)?.toLowerCase();

  const query = useQuery<{
    tokens: TokenHoldingDTO[];
    errors?: Record<string, string>;
  } | null>({
    queryKey: ["erc20-holdings", effectiveAddress],
    enabled: !!effectiveAddress, // only need an address; server endpoint uses server env keys
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnWindowFocus: true,
    refetchInterval: 300_000,
    retry: 1,
    placeholderData: (prev) => prev ?? null,
    queryFn: async () => {
      if (!effectiveAddress) return null;

      console.log(
        "🔍 Fetching token holdings via server API for:",
        effectiveAddress,
      );

      const res = await fetch(`/api/balances?address=${effectiveAddress}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Balances API error: ${res.status} ${text}`);
      }
      const json = await res.json();
      const tokens: TokenHoldingDTO[] = json.tokens ?? [];
      const errors: Record<string, string> | undefined = json.errors;

      if (errors) {
        if (errors.ethereum)
          console.error("❌ ETH balances error:", errors.ethereum);
        if (errors.polygon)
          console.error("❌ Polygon balances error:", errors.polygon);
      }

      if (tokens.length === 0 && errors && errors.ethereum && errors.polygon) {
        throw new Error(
          `Both chains failed: ETH(${errors.ethereum}), POLYGON(${errors.polygon})`,
        );
      }

      console.log("✅ Total tokens (server API):", tokens.length);
      return { tokens, errors };
    },
  });

  return {
    tokens: query.data?.tokens ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    updatedAt: query.dataUpdatedAt,
  };
}

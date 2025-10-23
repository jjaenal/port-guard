"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { getTokenBalances, type TokenHolding } from "@/lib/blockchain/balances";

export function useTokenHoldings() {
  const { address } = useAccount();
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

  const query = useQuery<{ tokens: TokenHolding[] } | null>({
    queryKey: ["erc20-holdings", address],
    enabled: !!address && !!apiKey,
    staleTime: 60_000,
    gcTime: 300_000, // keep cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 60_000, // background refresh every 60s
    retry: 1,
    placeholderData: (prev) => prev ?? null,
    queryFn: async () => {
      if (!address || !apiKey) return null;

      // Fetch ERC-20 balances and prices via util for Ethereum (1) and Polygon (137)
      const [ethTokens, polygonTokens] = await Promise.all([
        getTokenBalances(address, 1),
        getTokenBalances(address, 137),
      ]);

      const tokens: TokenHolding[] = [...ethTokens, ...polygonTokens].sort(
        (a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0)
      );

      return { tokens };
    },
  });

  return {
    tokens: query.data?.tokens ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
  };
}
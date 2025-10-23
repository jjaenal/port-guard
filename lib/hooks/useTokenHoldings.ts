"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { getTokenBalances, type TokenHolding } from "@/lib/blockchain/balances";

export function useTokenHoldings(addressOverride?: string) {
  const { address } = useAccount();
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

  const effectiveAddress = (addressOverride ?? address)?.toLowerCase();

  const query = useQuery<{ tokens: TokenHolding[] } | null>({
    queryKey: ["erc20-holdings", effectiveAddress],
    enabled: !!effectiveAddress && !!apiKey,
    staleTime: 300_000, // 5 minutes - match server cache
    gcTime: 600_000, // keep cache for 10 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 300_000, // background refresh every 5 minutes
    retry: 1,
    placeholderData: (prev) => prev ?? null,
    queryFn: async () => {
      if (!effectiveAddress || !apiKey) return null;

      // Fetch ERC-20 balances and prices via util for Ethereum (1) and Polygon (137)
      const [ethTokens, polygonTokens] = await Promise.all([
        getTokenBalances(effectiveAddress, 1),
        getTokenBalances(effectiveAddress, 137),
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
"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { getTokenPricesByAddress } from "@/lib/utils/coingecko";

export type ChainKey = "ethereum" | "polygon";

export type TokenHolding = {
  chain: ChainKey;
  contractAddress: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance: bigint;
  formatted?: string;
  priceUsd?: number;
  valueUsd?: number;
};

type AlchemyBalanceItem = {
  contractAddress: string;
  tokenBalance: string; // hex or decimal string
};

type AlchemyBalancesResponse = {
  tokenBalances: AlchemyBalanceItem[];
};

type TokenMetadata = {
  name?: string;
  symbol?: string;
  decimals?: number;
};

const ALCHEMY_ENDPOINTS: Record<ChainKey, (apiKey: string) => string> = {
  ethereum: (k) => `https://eth-mainnet.g.alchemy.com/v2/${k}`,
  polygon: (k) => `https://polygon-mainnet.g.alchemy.com/v2/${k}`,
};

async function rpcFetch<T>(url: string, body: { method: string; params?: unknown[] }): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
  });
  if (!res.ok) throw new Error(`Alchemy RPC failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Alchemy RPC error");
  return json.result as T;
}

async function getBalances(chain: ChainKey, address: string, apiKey: string): Promise<AlchemyBalanceItem[]> {
  const endpoint = ALCHEMY_ENDPOINTS[chain](apiKey);
  const result = await rpcFetch<AlchemyBalancesResponse>(endpoint, {
    method: "alchemy_getTokenBalances",
    params: [address],
  });
  return result.tokenBalances.filter((b) => b.tokenBalance && b.tokenBalance !== "0");
}

async function getMetadata(chain: ChainKey, contracts: string[], apiKey: string): Promise<Record<string, TokenMetadata>> {
  const endpoint = ALCHEMY_ENDPOINTS[chain](apiKey);
  const out: Record<string, TokenMetadata> = {};
  // Limit concurrent RPCs to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < contracts.length; i += batchSize) {
    const batch = contracts.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((addr) =>
        rpcFetch<TokenMetadata>(endpoint, {
          method: "alchemy_getTokenMetadata",
          params: [addr],
        })
          .then((r) => ({ addr, r }))
          .catch(() => ({ addr, r: {} as TokenMetadata })),
      ),
    );
    for (const { addr, r } of results) {
      out[addr.toLowerCase()] = {
        name: r?.name,
        symbol: r?.symbol,
        decimals: typeof r?.decimals === "number" ? r.decimals : undefined,
      };
    }
  }
  return out;
}

function platformIdForChain(chain: ChainKey): string {
  switch (chain) {
    case "ethereum":
      return "ethereum";
    case "polygon":
      return "polygon-pos";
    default:
      return "ethereum";
  }
}

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

      // Fetch balances for ethereum and polygon
      const [ethBalances, polygonBalances] = await Promise.all([
        getBalances("ethereum", address, apiKey),
        getBalances("polygon", address, apiKey),
      ]);

      // Deduplicate contract addresses per chain
      const ethContracts = Array.from(new Set(ethBalances.map((b) => b.contractAddress.toLowerCase())));
      const polygonContracts = Array.from(new Set(polygonBalances.map((b) => b.contractAddress.toLowerCase())));

      const [ethMeta, polygonMeta] = await Promise.all([
        getMetadata("ethereum", ethContracts, apiKey),
        getMetadata("polygon", polygonContracts, apiKey),
      ]);

      // Prices by address per platform
      const [ethPrices, polygonPrices] = await Promise.all([
        getTokenPricesByAddress(platformIdForChain("ethereum"), ethContracts),
        getTokenPricesByAddress(platformIdForChain("polygon"), polygonContracts),
      ]);

      const tokens: TokenHolding[] = [];

      for (const bal of ethBalances) {
        const addr = bal.contractAddress.toLowerCase();
        const meta = ethMeta[addr] || {};
        const decimals = meta.decimals ?? 18;
        const balanceBig = BigInt(bal.tokenBalance);
        const formatted = formatUnits(balanceBig, decimals);
        const priceUsd = ethPrices[addr]?.usd;
        const valueUsd = priceUsd ? Number(formatted) * priceUsd : undefined;
        tokens.push({
          chain: "ethereum",
          contractAddress: addr,
          symbol: meta.symbol,
          name: meta.name,
          decimals,
          balance: balanceBig,
          formatted,
          priceUsd,
          valueUsd,
        });
      }

      for (const bal of polygonBalances) {
        const addr = bal.contractAddress.toLowerCase();
        const meta = polygonMeta[addr] || {};
        const decimals = meta.decimals ?? 18;
        const balanceBig = BigInt(bal.tokenBalance);
        const formatted = formatUnits(balanceBig, decimals);
        const priceUsd = polygonPrices[addr]?.usd;
        const valueUsd = priceUsd ? Number(formatted) * priceUsd : undefined;
        tokens.push({
          chain: "polygon",
          contractAddress: addr,
          symbol: meta.symbol,
          name: meta.name,
          decimals,
          balance: balanceBig,
          formatted,
          priceUsd,
          valueUsd,
        });
      }

      // Sort by value desc
      tokens.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

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
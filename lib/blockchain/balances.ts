import { formatUnits } from "viem";

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

function chainKeyFromId(chainId: number): ChainKey {
  switch (chainId) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
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
          .catch(() => ({ addr, r: {} as TokenMetadata }))
      )
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

export async function getTokenBalances(address: string, chainId: number): Promise<TokenHolding[]> {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
  if (!apiKey) return [];

  const chain = chainKeyFromId(chainId);

  const balances = await getBalances(chain, address, apiKey);
  const contracts = Array.from(new Set(balances.map((b) => b.contractAddress.toLowerCase())));
  const meta = await getMetadata(chain, contracts, apiKey);

  const prices: Record<string, { usd?: number }> = contracts.length > 0
    ? await fetch(`/api/prices?platform=${platformIdForChain(chain)}&contracts=${contracts.join(",")}&vs=usd`)
        .then((res) => res.json())
        .then((json) => json.data || {})
        .catch(() => ({}))
    : {};

  const tokens: TokenHolding[] = [];
  for (const bal of balances) {
    const addr = bal.contractAddress.toLowerCase();
    const m = meta[addr] || {};
    const decimals = m.decimals ?? 18;
    const balanceBig = BigInt(bal.tokenBalance);
    const formatted = formatUnits(balanceBig, decimals);
    const priceUsd = prices[addr]?.usd;
    const valueUsd = priceUsd ? Number(formatted) * priceUsd : undefined;
    tokens.push({
      chain,
      contractAddress: addr,
      symbol: m.symbol,
      name: m.name,
      decimals,
      balance: balanceBig,
      formatted,
      priceUsd,
      valueUsd,
    });
  }

  // Sort by value desc
  tokens.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
  return tokens;
}
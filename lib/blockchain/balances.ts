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
  change24h?: number;
};

// DTO type for client-side serialization (BigInt -> string)
export type TokenHoldingDTO = Omit<TokenHolding, "balance"> & {
  balance: string;
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

async function rpcFetch<T>(
  url: string,
  body: { method: string; params?: unknown[] },
): Promise<T> {
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

async function getBalances(
  chain: ChainKey,
  address: string,
  apiKey: string,
): Promise<AlchemyBalanceItem[]> {
  const endpoint = ALCHEMY_ENDPOINTS[chain](apiKey);
  const result = await rpcFetch<AlchemyBalancesResponse>(endpoint, {
    method: "alchemy_getTokenBalances",
    params: [address],
  });
  return result.tokenBalances.filter(
    (b) => b.tokenBalance && b.tokenBalance !== "0",
  );
}

async function getMetadata(
  chain: ChainKey,
  contracts: string[],
  apiKey: string,
): Promise<Record<string, TokenMetadata>> {
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

// Simple in-memory cache for token balances
const balancesCache: Record<
  string,
  { timestamp: number; data: AlchemyBalanceItem[] }
> = {};
const metadataCache: Record<
  string,
  { timestamp: number; data: Record<string, TokenMetadata> }
> = {};
const pricesCache: Record<
  string,
  {
    timestamp: number;
    data: Record<string, { usd?: number; usd_24h_change?: number }>;
  }
> = {};

// Cache TTL in milliseconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getTokenBalances(
  address: string,
  chainId: number,
): Promise<TokenHolding[]> {
  // Prefer server-only keys when available, fallback to public keys
  const apiKey =
    chainId === 1
      ? process.env.ALCHEMY_API_KEY_ETHEREUM ||
        process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ETHEREUM ||
        process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
        ""
      : chainId === 137
        ? process.env.ALCHEMY_API_KEY_POLYGON ||
          process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_POLYGON ||
          process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
          ""
        : process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

  if (!apiKey) {
    console.warn("⚠️ No Alchemy API key found for chain", chainId);
    return [];
  }

  console.warn(`🔍 Getting token balances for ${address} on chain ${chainId}`);

  const chain = chainKeyFromId(chainId);
  const now = Date.now();
  const cacheKey = `${chain}:${address.toLowerCase()}`;

  // Get balances (from cache if available)
  let balances: AlchemyBalanceItem[];
  const cachedBalances = balancesCache[cacheKey];
  if (cachedBalances && now - cachedBalances.timestamp < CACHE_TTL) {
    console.warn(`📦 Using cached balances for ${chain}`);
    balances = cachedBalances.data;
  } else {
    console.warn(`🌐 Fetching fresh balances from Alchemy for ${chain}`);
    try {
      balances = await getBalances(chain, address, apiKey);
      balancesCache[cacheKey] = { timestamp: now, data: balances };
      console.warn(`✅ Got ${balances.length} token balances for ${chain}`);
    } catch (error) {
      console.error(`❌ Error fetching balances for ${chain}:`, error);
      throw error;
    }
  }

  const contracts = Array.from(
    new Set(balances.map((b) => b.contractAddress.toLowerCase())),
  );

  // Get metadata (from cache if available)
  const metaCacheKey = `${chain}:${contracts.join(",")}`;
  let meta: Record<string, TokenMetadata>;
  const cachedMeta = metadataCache[metaCacheKey];
  if (cachedMeta && now - cachedMeta.timestamp < CACHE_TTL) {
    console.warn(`📦 Using cached metadata for ${chain}`);
    meta = cachedMeta.data;
  } else {
    console.warn(`🌐 Fetching fresh metadata from Alchemy for ${chain}`);
    try {
      meta = await getMetadata(chain, contracts, apiKey);
      metadataCache[metaCacheKey] = { timestamp: now, data: meta };
      console.warn(
        `✅ Got metadata for ${Object.keys(meta).length} tokens on ${chain}`,
      );
    } catch (error) {
      console.error(`❌ Error fetching metadata for ${chain}:`, error);
      throw error;
    }
  }

  // Get prices (from cache if available)
  const pricesCacheKey = `${platformIdForChain(chain)}:${contracts.join(",")}`;
  let prices: Record<string, { usd?: number; usd_24h_change?: number }> = {};
  const cachedPrices = pricesCache[pricesCacheKey];

  if (contracts.length > 0) {
    if (cachedPrices && now - cachedPrices.timestamp < CACHE_TTL) {
      console.warn(`📦 Using cached prices for ${chain}`);
      prices = cachedPrices.data;
    } else {
      console.warn(`🌐 Fetching fresh prices for ${chain}`);
      try {
        prices = await fetch(
          `/api/prices?platform=${platformIdForChain(chain)}&contracts=${contracts.join(",")}&vs=usd`,
        )
          .then((res) => res.json())
          .then((json) => json.data || {});
        pricesCache[pricesCacheKey] = { timestamp: now, data: prices };
        console.warn(
          `✅ Got prices for ${Object.keys(prices).length} tokens on ${chain}`,
        );
      } catch (error) {
        console.error(`❌ Error fetching prices for ${chain}:`, error);
        // Don't throw here, continue without prices
        prices = {};
      }
    }
  }

  const tokens: TokenHolding[] = [];
  for (const bal of balances) {
    const addr = bal.contractAddress.toLowerCase();
    const m = meta[addr] || {};
    const decimals = m.decimals ?? 18;
    const balanceBig = BigInt(bal.tokenBalance);
    const formatted = formatUnits(balanceBig, decimals);
    const priceUsd = prices[addr]?.usd;
    const valueUsd = priceUsd ? Number(formatted) * priceUsd : undefined;
    const change24h = prices[addr]?.usd_24h_change;
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
      change24h,
    });
  }

  // Sort by value desc
  tokens.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
  -console.log(`✅ Returning ${tokens.length} processed tokens for ${chain}`);
  +console.warn(`✅ Returning ${tokens.length} processed tokens for ${chain}`);
  return tokens;
}

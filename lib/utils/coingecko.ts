/**
 * Fetches simple prices from CoinGecko for given token IDs.
 *
 * Returns USD price and optional 24h change percentage.
 * Intended for client-side usage with light rate limiting.
 *
 * @param ids - CoinGecko token IDs (e.g., ['ethereum', 'matic-network'])
 * @param vsCurrency - Target fiat currency (default: 'usd')
 * @returns Map of id -> { usd, usd_24h_change }
 */
export type SimplePriceItem = {
  usd: number;
  usd_24h_change?: number;
};

export type SimplePriceResponse = Record<string, SimplePriceItem>;

const DEFAULT_TTL_MS = 60_000;
const SIMPLE_CACHE = new Map<string, { expiresAt: number; data: SimplePriceResponse }>();
const CONTRACT_CACHE = new Map<string, { expiresAt: number; data: ContractPriceResponse }>();

function normalizeIds(ids: string[]): string {
  return ids.map((i) => i.toLowerCase()).sort().join(",");
}
function normalizeAddresses(addrs: string[]): string {
  return addrs.map((a) => a.toLowerCase()).sort().join(",");
}

export async function getSimplePrices(
  ids: string[],
  vsCurrency: string = "usd",
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<SimplePriceResponse> {
  const key = `${normalizeIds(ids)}|${vsCurrency.toLowerCase()}`;
  const cached = SIMPLE_CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const base = "https://api.coingecko.com/api/v3/simple/price";
  const url = `${base}?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=${vsCurrency}&include_24hr_change=true`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CoinGecko request failed: ${res.status}`);
  }

  const data = (await res.json()) as SimplePriceResponse;
  SIMPLE_CACHE.set(key, { expiresAt: Date.now() + ttlMs, data });
  // Optional: cap cache size
  if (SIMPLE_CACHE.size > 100) {
    const firstKey = SIMPLE_CACHE.keys().next().value as string;
    SIMPLE_CACHE.delete(firstKey);
  }
  return data;
}

export type ContractPriceItem = {
  usd: number;
};

export type ContractPriceResponse = Record<string, ContractPriceItem>;

export async function getTokenPricesByAddress(
  platformId: string,
  addresses: string[],
  vsCurrency: string = "usd",
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<ContractPriceResponse> {
  if (addresses.length === 0) return {};

  const key = `${platformId.toLowerCase()}|${normalizeAddresses(addresses)}|${vsCurrency.toLowerCase()}`;
  const cached = CONTRACT_CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const base = `https://api.coingecko.com/api/v3/simple/token_price/${platformId}`;
  const url = `${base}?contract_addresses=${encodeURIComponent(addresses.join(","))}&vs_currencies=${vsCurrency}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CoinGecko token price failed: ${res.status}`);
  }

  const data = (await res.json()) as ContractPriceResponse;
  CONTRACT_CACHE.set(key, { expiresAt: Date.now() + ttlMs, data });
  if (CONTRACT_CACHE.size > 200) {
    const firstKey = CONTRACT_CACHE.keys().next().value as string;
    CONTRACT_CACHE.delete(firstKey);
  }
  return data;
}

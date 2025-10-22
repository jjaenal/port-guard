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

export async function getSimplePrices(
  ids: string[],
  vsCurrency: string = "usd",
): Promise<SimplePriceResponse> {
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
  return data;
}

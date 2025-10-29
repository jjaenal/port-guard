/**
 * CoinGecko API client for fetching token prices
 */

const API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
const BASE_URL = "https://api.coingecko.com/api/v3";

/**
 * Fetches the current price of a token by symbol
 * @param symbol Token symbol (e.g., 'BTC', 'ETH')
 * @returns Current price in USD or null if not found
 */
export async function fetchTokenPrice(symbol: string): Promise<number | null> {
  try {
    // Convert symbol to lowercase for API compatibility
    const tokenId = mapSymbolToId(symbol.toLowerCase());

    if (!tokenId) {
      console.warn(`No CoinGecko ID found for symbol: ${symbol}`);
      return null;
    }

    const url = `${BASE_URL}/simple/price?ids=${tokenId}&vs_currencies=usd`;
    const headers: HeadersInit = {};

    if (API_KEY) {
      headers["x-cg-pro-api-key"] = API_KEY;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data[tokenId] || !data[tokenId].usd) {
      return null;
    }

    return data[tokenId].usd;
  } catch (error) {
    console.error("Error fetching token price:", error);
    return null;
  }
}

/**
 * Maps common token symbols to CoinGecko IDs
 * @param symbol Token symbol in lowercase
 * @returns CoinGecko ID or the original symbol if not found in mapping
 */
function mapSymbolToId(symbol: string): string {
  const mapping: Record<string, string> = {
    btc: "bitcoin",
    eth: "ethereum",
    usdt: "tether",
    usdc: "usd-coin",
    bnb: "binancecoin",
    xrp: "ripple",
    ada: "cardano",
    sol: "solana",
    doge: "dogecoin",
    dot: "polkadot",
    avax: "avalanche-2",
    shib: "shiba-inu",
    matic: "matic-network",
    link: "chainlink",
    uni: "uniswap",
    atom: "cosmos",
    ltc: "litecoin",
    etc: "ethereum-classic",
    near: "near",
    algo: "algorand",
    vet: "vechain",
    fil: "filecoin",
    icp: "internet-computer",
    xtz: "tezos",
    axs: "axie-infinity",
    sand: "the-sandbox",
    mana: "decentraland",
    aave: "aave",
    cake: "pancakeswap-token",
    mkr: "maker",
    snx: "havven",
    comp: "compound-governance-token",
    ldo: "lido-dao",
    crv: "curve-dao-token",
    cvx: "convex-finance",
    gmx: "gmx",
    arb: "arbitrum",
    op: "optimism",
  };

  return mapping[symbol] || symbol;
}

/**
 * Fetches historical price data for a token
 * @param symbol Token symbol
 * @param days Number of days of historical data
 * @returns Array of price data points or null if error
 */
export async function fetchTokenPriceHistory(
  symbol: string,
  days = 7,
): Promise<{ prices: [number, number][] } | null> {
  try {
    const tokenId = mapSymbolToId(symbol.toLowerCase());

    if (!tokenId) {
      return null;
    }

    const url = `${BASE_URL}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}`;
    const headers: HeadersInit = {};

    if (API_KEY) {
      headers["x-cg-pro-api-key"] = API_KEY;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching token price history:", error);
    return null;
  }
}

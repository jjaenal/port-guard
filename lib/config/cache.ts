/**
 * Centralized cache TTL configuration for the application.
 * 
 * This configuration object defines cache durations (in minutes) for different
 * data sources across the DeFi portfolio dashboard. Having centralized TTL
 * values makes it easier to adjust cache behavior and maintain consistency.
 */
export const CACHE_TTLS = {
  /** Token balances and ERC-20 holdings - frequent updates needed */
  BALANCES: 3,
  
  /** DeFi rewards estimation - moderate update frequency */
  REWARDS: 5,
  
  /** DeFi protocol positions (Lido, Rocket Pool, Uniswap) - less frequent updates */
  DEFI_POSITIONS: 10,
  
  /** Token prices from CoinGecko - moderate update frequency */
  PRICES: 5,
  
  /** Portfolio snapshots - can be cached longer */
  SNAPSHOTS: 15,
} as const;

/**
 * Type for cache TTL keys to ensure type safety when accessing TTL values.
 */
export type CacheTTLKey = keyof typeof CACHE_TTLS;
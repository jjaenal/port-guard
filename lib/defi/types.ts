/**
 * Generic staking protocol types and interfaces
 */

export interface StakingPosition {
  /** Protocol identifier (e.g., 'lido', 'rocket-pool', 'frax') */
  protocol: string;
  /** Protocol display name */
  protocolName: string;
  /** Staked token symbol (e.g., 'stETH', 'rETH') */
  stakedToken: string;
  /** Underlying token symbol (e.g., 'ETH') */
  underlyingToken: string;
  /** Staked balance in human-readable format */
  balance: number;
  /** Current value in USD */
  value: number;
  /** Current APR as percentage */
  apr: number;
  /** Daily rewards in underlying token */
  dailyRewards: number;
  /** Monthly rewards in underlying token */
  monthlyRewards: number;
  /** Token contract address */
  tokenAddress: string;
  /** Protocol logo URL */
  logo?: string;
}

export interface StakingRewards {
  /** Daily rewards in underlying token */
  daily: number;
  /** Monthly rewards in underlying token */
  monthly: number;
  /** Annual rewards in underlying token */
  annual: number;
  /** Claimable rewards (if applicable) */
  claimable?: number;
}

export interface StakingProtocolInfo {
  /** Protocol identifier */
  id: string;
  /** Display name */
  name: string;
  /** Protocol description */
  description: string;
  /** Supported tokens */
  supportedTokens: string[];
  /** Protocol website */
  website: string;
  /** Logo URL */
  logo?: string;
}

export interface StakingAdapter {
  /** Get staking position for an address */
  getPosition(address: string): Promise<StakingPosition | null>;
  /** Get protocol information */
  getProtocolInfo(): StakingProtocolInfo;
  /** Calculate rewards for a given balance */
  calculateRewards(balance: number, apr: number): StakingRewards;
}

export interface StakingProtocolRegistry {
  /** Register a staking adapter */
  register(adapter: StakingAdapter): void;
  /** Get all registered protocols */
  getProtocols(): StakingProtocolInfo[];
  /** Get adapter by protocol ID */
  getAdapter(protocolId: string): StakingAdapter | undefined;
  /** Get all positions for an address */
  getAllPositions(address: string): Promise<StakingPosition[]>;
}

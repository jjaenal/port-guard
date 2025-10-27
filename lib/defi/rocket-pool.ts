import type { Address } from "viem";
import type {
  StakingAdapter,
  StakingPosition,
  StakingProtocolInfo,
  StakingRewards,
} from "./types";

const RETH_ADDRESS = "0xae78736cd615f374d3085123a210448e74fc6393";

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

async function getAlchemyEndpoint(): Promise<string | null> {
  const apiKey =
    process.env.ALCHEMY_API_KEY_ETHEREUM ||
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ETHEREUM ||
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
    "";
  if (!apiKey) return null;
  return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
}

async function getRethBalance(address: Address): Promise<{ raw: bigint }> {
  const endpoint = await getAlchemyEndpoint();
  if (!endpoint) return { raw: BigInt(0) };

  const result = await rpcFetch<{
    tokenBalances: Array<{ contractAddress: string; tokenBalance: string }>;
  }>(endpoint, {
    method: "alchemy_getTokenBalances",
    params: [address, [RETH_ADDRESS]],
  });

  const item = result.tokenBalances?.[0];
  const rawStr = item?.tokenBalance || "0";
  try {
    const raw = BigInt(rawStr);
    return { raw };
  } catch {
    return { raw: BigInt(0) };
  }
}

async function getRethMetadata(): Promise<{
  symbol: string;
  name: string;
  decimals: number;
}> {
  const endpoint = await getAlchemyEndpoint();
  if (!endpoint)
    return { symbol: "rETH", name: "Rocket Pool ETH", decimals: 18 };

  const meta = await rpcFetch<{
    name?: string;
    symbol?: string;
    decimals?: number;
  }>(endpoint, {
    method: "alchemy_getTokenMetadata",
    params: [RETH_ADDRESS],
  }).catch(() => ({
    name: "Rocket Pool ETH",
    symbol: "rETH",
    decimals: 18,
  }));

  return {
    symbol: meta?.symbol || "rETH",
    name: meta?.name || "Rocket Pool ETH",
    decimals: typeof meta?.decimals === "number" ? meta.decimals : 18,
  };
}

async function getRethPrice(): Promise<number | undefined> {
  try {
    const res = await fetch(
      `/api/prices?platform=ethereum&contracts=${RETH_ADDRESS}&vs=usd&include_24hr_change=true`,
    );
    if (!res.ok) return undefined;
    const json = await res.json();
    const data = (json?.data || {}) as Record<string, { usd?: number }>;
    const p = data[RETH_ADDRESS.toLowerCase()]?.usd;
    return typeof p === "number" ? p : undefined;
  } catch {
    return undefined;
  }
}

async function getRethApr(): Promise<number | undefined> {
  try {
    // Rocket Pool doesn't have a direct APR API, so we'll use a reasonable estimate
    // In production, you'd want to calculate this from on-chain data or use a third-party API
    return 3.2; // Approximate current rETH APR
  } catch {
    return undefined;
  }
}

export type RocketPoolSummary = {
  chain: "ethereum";
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  balance: string;
  balanceRaw: string;
  priceUsd?: number;
  valueUsd?: number;
  apr?: number;
  estimatedDailyRewardsUsd?: number;
};

/**
 * Mengambil ringkasan posisi Rocket Pool rETH untuk sebuah alamat Ethereum.
 */
export async function getRocketPoolSummary(
  address: Address,
): Promise<RocketPoolSummary> {
  const [{ raw }, meta, priceUsd, apr] = await Promise.all([
    getRethBalance(address),
    getRethMetadata(),
    getRethPrice(),
    getRethApr(),
  ]);

  const formatted = (Number(raw) / Math.pow(10, meta.decimals)).toString();
  const valueUsd = priceUsd ? Number(formatted) * priceUsd : undefined;
  const estimatedDailyRewardsUsd =
    valueUsd && apr ? (valueUsd * (apr / 100)) / 365 : undefined;

  return {
    chain: "ethereum",
    token: {
      address: RETH_ADDRESS,
      symbol: meta.symbol,
      name: meta.name,
      decimals: meta.decimals,
    },
    balance: formatted,
    balanceRaw: raw.toString(),
    priceUsd,
    valueUsd,
    apr,
    estimatedDailyRewardsUsd,
  };
}

/**
 * Rocket Pool Staking Adapter
 */
export class RocketPoolAdapter implements StakingAdapter {
  async getPosition(address: string): Promise<StakingPosition | null> {
    const summary = await getRocketPoolSummary(address as Address);

    if (!summary.balance || Number(summary.balance) === 0) {
      return null;
    }

    const balance = Number(summary.balance);
    const value = summary.valueUsd || 0;
    const apr = summary.apr || 0;
    const dailyRewards = (balance * (apr / 100)) / 365;
    const monthlyRewards = dailyRewards * 30;

    return {
      protocol: "rocket-pool",
      protocolName: "Rocket Pool",
      stakedToken: "rETH",
      underlyingToken: "ETH",
      balance,
      value,
      apr,
      dailyRewards,
      monthlyRewards,
      tokenAddress: RETH_ADDRESS,
      logo: "https://assets.coingecko.com/coins/images/20764/small/reth.png",
    };
  }

  getProtocolInfo(): StakingProtocolInfo {
    return {
      id: "rocket-pool",
      name: "Rocket Pool",
      description: "Decentralised Ethereum staking protocol",
      supportedTokens: ["ETH"],
      website: "https://rocketpool.net",
      logo: "https://assets.coingecko.com/coins/images/20764/small/reth.png",
    };
  }

  calculateRewards(balance: number, apr: number): StakingRewards {
    const annual = balance * (apr / 100);
    const daily = annual / 365;
    const monthly = daily * 30;

    return {
      daily,
      monthly,
      annual,
    };
  }
}

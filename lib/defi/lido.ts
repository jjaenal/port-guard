import type { Address } from "viem";

type AprLastResponse = { data?: { apr?: number }; apr?: number };

export type LidoStethSummary = {
  chain: "ethereum";
  token: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  balance: string; // formatted decimal string
  balanceRaw: string; // raw bigint string
  priceUsd?: number;
  valueUsd?: number;
  apr?: number; // annual APR percentage
  estimatedDailyRewardsUsd?: number;
};

const STETH_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";

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

async function getStethBalance(address: Address): Promise<{
  raw: bigint;
}> {
  const endpoint = await getAlchemyEndpoint();
  if (!endpoint) return { raw: 0n };
  // Use alchemy_getTokenBalances with specific contract to minimize payload
  const result = await rpcFetch<{
    tokenBalances: Array<{ contractAddress: string; tokenBalance: string }>;
  }>(endpoint, {
    method: "alchemy_getTokenBalances",
    params: [address, [STETH_ADDRESS]],
  });
  const item = result.tokenBalances?.[0];
  const rawStr = item?.tokenBalance || "0";
  try {
    const raw = BigInt(rawStr);
    return { raw };
  } catch {
    return { raw: 0n };
  }
}

async function getStethMetadata(): Promise<{
  symbol: string;
  name: string;
  decimals: number;
}> {
  const endpoint = await getAlchemyEndpoint();
  if (!endpoint)
    return { symbol: "stETH", name: "Lido Staked Ether", decimals: 18 };
  const meta = await rpcFetch<{
    name?: string;
    symbol?: string;
    decimals?: number;
  }>(endpoint, {
    method: "alchemy_getTokenMetadata",
    params: [STETH_ADDRESS],
  }).catch(() => ({
    name: "Lido Staked Ether",
    symbol: "stETH",
    decimals: 18,
  }));
  return {
    symbol: meta?.symbol || "stETH",
    name: meta?.name || "Lido Staked Ether",
    decimals: typeof meta?.decimals === "number" ? meta.decimals : 18,
  };
}

async function getStethPrice(): Promise<number | undefined> {
  try {
    const res = await fetch(
      `/api/prices?platform=ethereum&contracts=${STETH_ADDRESS}&vs=usd&include_24hr_change=true`,
    );
    if (!res.ok) return undefined;
    const json = await res.json();
    const data = (json?.data || {}) as Record<string, { usd?: number }>;
    const p = data[STETH_ADDRESS.toLowerCase()]?.usd;
    return typeof p === "number" ? p : undefined;
  } catch {
    return undefined;
  }
}

async function getStethApr(): Promise<number | undefined> {
  try {
    const res = await fetch(
      "https://eth-api.lido.fi/v1/protocol/steth/apr/last",
    );
    if (!res.ok) return undefined;
    const json = (await res.json()) as AprLastResponse;
    const apr = typeof json?.apr === "number" ? json.apr : json?.data?.apr;
    return typeof apr === "number" ? apr : undefined;
  } catch {
    return undefined;
  }
}

export async function getLidoStethSummary(
  address: Address,
): Promise<LidoStethSummary> {
  const [{ raw }, meta, priceUsd, apr] = await Promise.all([
    getStethBalance(address),
    getStethMetadata(),
    getStethPrice(),
    getStethApr(),
  ]);

  const formatted = (Number(raw) / Math.pow(10, meta.decimals)).toString();
  const valueUsd = priceUsd ? Number(formatted) * priceUsd : undefined;
  const estimatedDailyRewardsUsd =
    valueUsd && apr ? (valueUsd * (apr / 100)) / 365 : undefined;

  return {
    chain: "ethereum",
    token: {
      address: STETH_ADDRESS,
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

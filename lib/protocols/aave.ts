export type AaveChain = "ethereum" | "polygon";

const AAVE_V3_SUBGRAPH: Record<AaveChain, string> = {
  // Ethereum Mainnet
  ethereum: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3",
  // Polygon PoS
  polygon: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon",
};

interface AaveUserReserve {
  currentATokenBalance: string; // scaled balance in token units
  currentTotalDebt: string; // variable + stable
  reserve: {
    id: string;
    symbol: string;
    decimals: number;
    liquidityRate?: string; // RAY (1e27)
    variableBorrowRate?: string; // RAY (1e27)
    stableBorrowRate?: string; // RAY (1e27)
  };
}

interface AaveUserEntity {
  id: string;
  healthFactor?: string;
}

interface GraphResponse {
  data?: {
    users?: AaveUserEntity[];
    userReserves?: AaveUserReserve[];
  };
  errors?: Array<{ message: string }>; // GraphQL errors
}

export interface AaveChainSummary {
  chain: AaveChain;
  suppliedCount: number;
  borrowedCount: number;
  healthFactor: number | null;
  supplyApyMin?: number | null;
  supplyApyMax?: number | null;
  borrowApyMin?: number | null;
  borrowApyMax?: number | null;
}

export interface AavePositionsSummary {
  chains: AaveChainSummary[];
  totals: {
    suppliedCount: number;
    borrowedCount: number;
  };
}

function isNonZero(value?: string): boolean {
  if (!value) return false;
  // Remove non-digit characters and check for any non-zero digit
  const digitsOnly = value.replace(/[^0-9]/g, "");
  return /[1-9]/.test(digitsOnly);
}

function rayToPercent(ray?: string): number | null {
  if (!ray) return null;
  const num = parseFloat(ray);
  if (!Number.isFinite(num)) return null;
  return (num / 1e27) * 100;
}

async function fetchChainPositions(
  chain: AaveChain,
  address: string,
): Promise<AaveChainSummary> {
  const endpoint = AAVE_V3_SUBGRAPH[chain];
  const query = `
    query GetUserPositions($user: String!) {
      users(where: { id: $user }) { id healthFactor }
      userReserves(where: { user: $user }) {
        currentATokenBalance
        currentTotalDebt
        reserve { id symbol decimals liquidityRate variableBorrowRate stableBorrowRate }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { user: address.toLowerCase() } }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Aave subgraph ${chain} failed: ${res.status} ${text?.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as GraphResponse;
  if (json.errors?.length) {
    throw new Error(
      `Aave subgraph ${chain} error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  const user = json.data?.users?.[0];
  const reserves = json.data?.userReserves || [];

  const suppliedReserves = reserves.filter((r) =>
    isNonZero(r.currentATokenBalance),
  );
  const borrowedReserves = reserves.filter((r) =>
    isNonZero(r.currentTotalDebt),
  );

  const suppliedCount = suppliedReserves.length;
  const borrowedCount = borrowedReserves.length;

  let hf: number | null = null;
  if (user?.healthFactor) {
    // healthFactor typically scaled by 1e18 in Aave; present as float
    const raw = parseFloat(user.healthFactor);
    hf = Number.isFinite(raw) ? raw / 1e18 : null;
  }

  const supplyApys = suppliedReserves
    .map((r) => rayToPercent(r.reserve.liquidityRate))
    .filter((v): v is number => v != null && Number.isFinite(v));
  const borrowApys = borrowedReserves
    .map((r) => rayToPercent(r.reserve.variableBorrowRate))
    .filter((v): v is number => v != null && Number.isFinite(v));

  const supplyApyMin = supplyApys.length ? Math.min(...supplyApys) : null;
  const supplyApyMax = supplyApys.length ? Math.max(...supplyApys) : null;
  const borrowApyMin = borrowApys.length ? Math.min(...borrowApys) : null;
  const borrowApyMax = borrowApys.length ? Math.max(...borrowApys) : null;

  return {
    chain,
    suppliedCount,
    borrowedCount,
    healthFactor: hf,
    supplyApyMin,
    supplyApyMax,
    borrowApyMin,
    borrowApyMax,
  };
}

export async function getAavePositions(
  address: string,
  chains: AaveChain[] = ["ethereum", "polygon"],
): Promise<AavePositionsSummary> {
  const uniqueChains = Array.from(new Set(chains)).filter(
    (c): c is AaveChain => c === "ethereum" || c === "polygon",
  );

  const results = await Promise.all(
    uniqueChains.map((chain) => fetchChainPositions(chain, address)),
  );

  const totals = results.reduce(
    (acc, r) => {
      acc.suppliedCount += r.suppliedCount;
      acc.borrowedCount += r.borrowedCount;
      return acc;
    },
    { suppliedCount: 0, borrowedCount: 0 },
  );

  return { chains: results, totals };
}

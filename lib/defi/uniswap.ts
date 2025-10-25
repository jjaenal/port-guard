import type { Address } from "viem";

const GRAPH_ETH = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";
const GRAPH_POLYGON =
  "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon";

export type UniswapPosition = {
  id: string;
  chain: "ethereum" | "polygon";
  poolAddress: string;
  token0: { symbol: string; address: string };
  token1: { symbol: string; address: string };
  liquidity: number;
  poolLiquidity: number;
  poolTvlUsd: number;
  feeTier?: number;
  estimatedUsd: number;
  apr7d?: number;
};

type GraphResponse<T> = { data: T; errors?: Array<{ message: string }> };

async function graphQuery<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Graph request failed: ${res.status}`);
  const json = (await res.json()) as GraphResponse<T>;
  if (json.errors && json.errors.length > 0)
    throw new Error(json.errors[0].message || "Graph error");
  return json.data;
}

const POSITIONS_QUERY = `
  query Positions($owner: String!) {
    positions(where: { owner: $owner }) {
      id
      liquidity
      pool {
        id
        liquidity
        totalValueLockedUSD
        feeTier
        token0 { id symbol }
        token1 { id symbol }
      }
    }
  }
`;

type PositionsQueryData = {
  positions: Array<{
    id: string;
    liquidity: string;
    pool: {
      id: string;
      liquidity: string;
      totalValueLockedUSD: string;
      feeTier: string;
      token0: { id: string; symbol: string };
      token1: { id: string; symbol: string };
    };
  }>;
};

function mapPositions(
  chain: "ethereum" | "polygon",
  data: PositionsQueryData,
): UniswapPosition[] {
  const positions = data?.positions ?? [];
  return positions.map((p) => {
    const pool = p.pool;
    const poolLiquidity = Number(pool.liquidity ?? 0);
    const posLiquidity = Number(p.liquidity ?? 0);
    const poolTvlUsd = Number(pool.totalValueLockedUSD ?? 0);
    const share = poolLiquidity > 0 ? posLiquidity / poolLiquidity : 0;
    const estimatedUsd = poolTvlUsd * share;
    const feeTier = Number(pool.feeTier ?? 0);
    return {
      id: String(p.id),
      chain,
      poolAddress: String(pool.id),
      token0: {
        symbol: String(pool.token0.symbol),
        address: String(pool.token0.id),
      },
      token1: {
        symbol: String(pool.token1.symbol),
        address: String(pool.token1.id),
      },
      liquidity: posLiquidity,
      poolLiquidity,
      poolTvlUsd,
      feeTier,
      estimatedUsd,
    };
  });
}

const POOL_DAY_DATAS_QUERY = `
  query PoolDayDatas($poolIds: [String!]!) {
    poolDayDatas(where: { pool_in: $poolIds }, orderBy: date, orderDirection: desc, first: 700) {
      pool { id }
      volumeUSD
      date
    }
  }
`;

type PoolDayDataItem = {
  pool: { id: string };
  volumeUSD: string;
  date: number;
};

type PoolDayDatasQueryData = {
  poolDayDatas: PoolDayDataItem[];
};

async function getPoolsApr7d(
  chain: "ethereum" | "polygon",
  poolIds: string[],
): Promise<Record<string, number>> {
  if (poolIds.length === 0) return {};
  const url = chain === "ethereum" ? GRAPH_ETH : GRAPH_POLYGON;
  const data = await graphQuery<PoolDayDatasQueryData>(
    url,
    POOL_DAY_DATAS_QUERY,
    { poolIds },
  );
  // group by pool id and take last 7 entries
  const grouped: Record<string, PoolDayDataItem[]> = {};
  for (const d of data.poolDayDatas) {
    if (!grouped[d.pool.id]) grouped[d.pool.id] = [];
    if (grouped[d.pool.id].length < 7) grouped[d.pool.id].push(d);
  }
  const aprMap: Record<string, number> = {};
  for (const pid of Object.keys(grouped)) {
    const days = grouped[pid];
    const volSum = days.reduce((acc, it) => acc + Number(it.volumeUSD || 0), 0);
    // APR = (volume * fee% / TVL) * 52 ; TVL per pool needs to be passed in; We'll compute later using position data
    aprMap[pid] = volSum; // temporary store volume; actual APR computed in aggregator
  }
  return aprMap;
}

export async function getUniswapV3Positions(
  owner: Address,
): Promise<{
  positions: UniswapPosition[];
  totalUsd: number;
  avgApr7d: number;
}> {
  const ownerStr = String(owner).toLowerCase();
  const [ethData, polygonData]: [PositionsQueryData, PositionsQueryData] =
    await Promise.all([
      graphQuery<PositionsQueryData>(GRAPH_ETH, POSITIONS_QUERY, {
        owner: ownerStr,
      }),
      graphQuery<PositionsQueryData>(GRAPH_POLYGON, POSITIONS_QUERY, {
        owner: ownerStr,
      }),
    ]);
  const ethPositions = mapPositions("ethereum", ethData);
  const polygonPositions = mapPositions("polygon", polygonData);
  const positions = [...ethPositions, ...polygonPositions];

  // Collect APR input per chain
  const ethPoolIds = Array.from(
    new Set(ethPositions.map((p) => p.poolAddress)),
  );
  const polygonPoolIds = Array.from(
    new Set(polygonPositions.map((p) => p.poolAddress)),
  );
  const [ethVolMap, polygonVolMap] = await Promise.all([
    getPoolsApr7d("ethereum", ethPoolIds),
    getPoolsApr7d("polygon", polygonPoolIds),
  ]);

  // Compute APR for each position using pool's last 7d volume and feeTier
  for (const p of positions) {
    const volSum =
      p.chain === "ethereum"
        ? ethVolMap[p.poolAddress]
        : polygonVolMap[p.poolAddress];
    const feePct = (p.feeTier ?? 0) / 10_000; // e.g. 500->0.05%
    const tvl = p.poolTvlUsd || 0;
    const apr = tvl > 0 ? (((volSum || 0) * feePct) / tvl) * 52 : 0;
    p.apr7d = apr;
  }

  const totalUsd = positions.reduce((acc, p) => acc + (p.estimatedUsd || 0), 0);
  const avgApr7d =
    totalUsd > 0
      ? positions.reduce(
          (acc, p) => acc + (p.apr7d || 0) * (p.estimatedUsd || 0),
          0,
        ) / totalUsd
      : 0;

  return { positions, totalUsd, avgApr7d };
}

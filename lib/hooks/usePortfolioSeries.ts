import { useQuery } from "@tanstack/react-query";
import {
  getMarketChart,
  getContractMarketChart,
  type MarketChartPoint,
} from "@/lib/utils/coingecko";
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";
import { useEffect } from "react";
import { toast } from "sonner";

export type SeriesPoint = { t: number; v: number };
export type PortfolioSeriesResult = {
  points: SeriesPoint[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

function platformIdForChain(chain: "ethereum" | "polygon"): string {
  return chain === "polygon" ? "polygon-pos" : "ethereum";
}

/**
 * Menghitung seri nilai portofolio (USD) untuk range hari tertentu
 * berdasarkan saldo ETH, MATIC, dan ERC-20 (top 10 by value).
 */
export function usePortfolioSeries(
  ethAmount: number,
  maticAmount: number,
  erc20Tokens: TokenHoldingDTO[],
  enabled: boolean,
  rangeDays: number = 7,
): PortfolioSeriesResult {
  const topTokens = (erc20Tokens ?? [])
    .slice() // copy
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    .slice(0, 10);

  const interval: "hourly" | "daily" = rangeDays <= 7 ? "hourly" : "daily";

  const query = useQuery({
    queryKey: [
      "portfolio-series",
      {
        ethAmount,
        maticAmount,
        tokens: topTokens.map((t) => t.contractAddress),
        rangeDays,
        interval,
      },
    ],
    queryFn: async () => {
      const [ethPrices, maticPrices]: [MarketChartPoint[], MarketChartPoint[]] =
        await Promise.all([
          getMarketChart("ethereum", "usd", rangeDays, interval, 60_000),
          getMarketChart("matic-network", "usd", rangeDays, interval, 60_000),
        ]);

      // Ambil histori harga untuk token ERC-20 top
      const tokenChartsEntries = await Promise.all(
        topTokens.map(async (t) => {
          const platform = platformIdForChain(t.chain);
          const prices = await getContractMarketChart(
            platform,
            t.contractAddress,
            "usd",
            rangeDays,
            interval,
            60_000,
          );
          return [t.contractAddress, prices] as const;
        }),
      );
      const tokenCharts = new Map<string, MarketChartPoint[]>(
        tokenChartsEntries,
      );

      // Normalisasi ke timestamp bersama, gunakan ETH sebagai referensi
      const ethMap = new Map<number, number>(ethPrices.map(([t, p]) => [t, p]));
      const maticMap = new Map<number, number>(
        maticPrices.map(([t, p]) => [t, p]),
      );

      const timestamps = Array.from(ethMap.keys()).sort((a, b) => a - b);
      const points: SeriesPoint[] = timestamps.map((t) => {
        const ethPrice = ethMap.get(t) ?? 0;
        const maticPrice = maticMap.get(t) ?? 0;
        let valueUsd = ethAmount * ethPrice + maticAmount * maticPrice;

        // Tambahkan nilai ERC-20
        for (const tok of topTokens) {
          const series = tokenCharts.get(tok.contractAddress) ?? [];
          // Cari harga terdekat by exact timestamp (Coingecko timestamps align per interval)
          const priceAtT = series.find((pt) => pt[0] === t)?.[1] ?? 0;
          const qty = tok.formatted ? Number(tok.formatted) : 0;
          valueUsd += qty * priceAtT;
        }

        return { t, v: valueUsd };
      });

      return points;
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
    refetchInterval: 300_000,
    refetchOnWindowFocus: true,
  });

  return {
    points: query.data ?? [],
    isLoading: query.isLoading,
    isError: !!query.error,
    error: query.error,
  };
}

// Side-effect to surface price API errors with user-friendly toasts
export function usePortfolioSeriesToasts(
  ...args: Parameters<typeof usePortfolioSeries>
) {
  const result = usePortfolioSeries(...args);
  useEffect(() => {
    if (result.isError) {
      const msg =
        (result.error as Error | undefined)?.message ||
        "Failed to load price history";
      // Map common cases for clarity
      const friendly = /429/.test(msg)
        ? "Price API rate limit hit. Please wait a moment."
        : /CoinGecko/.test(msg)
          ? msg
          : msg;
      toast.error(friendly);
    }
  }, [result.isError, result.error]);
  return result;
}

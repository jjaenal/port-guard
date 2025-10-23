import { useQuery } from "@tanstack/react-query";
import { getMarketChart, type MarketChartPoint } from "@/lib/utils/coingecko";

export type SeriesPoint = { t: number; v: number };
export type PortfolioSeriesResult = {
  points: SeriesPoint[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

/**
 * Menghitung seri nilai portofolio (USD) 7 hari terakhir
 * dengan mengalikan harga historis ETH dan MATIC dengan
 * jumlah saldo masing-masing.
 *
 * Catatan: Saat ini hanya ETH & MATIC. Dukungan ERC-20 historis
 * dapat ditambahkan menggunakan endpoint contract market chart.
 */
export function usePortfolioSeries(
  ethAmount: number,
  maticAmount: number,
  enabled: boolean,
): PortfolioSeriesResult {
  const query = useQuery({
    queryKey: ["portfolio-series", { ethAmount, maticAmount }],
    queryFn: async () => {
      const [ethPrices, maticPrices]: [MarketChartPoint[], MarketChartPoint[]] =
        await Promise.all([
          getMarketChart("ethereum", "usd", 7, "hourly", 60_000),
          getMarketChart("matic-network", "usd", 7, "hourly", 60_000),
        ]);

      // Normalisasi ke timestamp bersama, gunakan ETH sebagai referensi
      const ethMap = new Map<number, number>(ethPrices.map(([t, p]) => [t, p]));
      const maticMap = new Map<number, number>(
        maticPrices.map(([t, p]) => [t, p]),
      );

      const timestamps = Array.from(ethMap.keys()).sort((a, b) => a - b);
      const points: SeriesPoint[] = timestamps.map((t) => {
        const ethPrice = ethMap.get(t) ?? 0;
        const maticPrice = maticMap.get(t) ?? 0;
        const valueUsd = ethAmount * ethPrice + maticAmount * maticPrice;
        return { t, v: valueUsd };
      });

      return points;
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  return {
    points: query.data ?? [],
    isLoading: query.isLoading,
    isError: !!query.error,
    error: query.error,
  };
}

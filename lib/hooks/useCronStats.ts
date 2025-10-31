import { useState, useEffect } from "react";

/**
 * Interface untuk cron stats data
 */
interface CronStats {
  lastRunAt: string | null;
  alertsEvaluated: number;
  alertsTriggered: number;
  totalRuns: number;
  averageDurationMs: number;
  lastDurationMs: number | null;
}

/**
 * Hook untuk fetch cron statistics dari API
 * Auto-refresh setiap 30 detik untuk data real-time
 */
export function useCronStats() {
  const [data, setData] = useState<CronStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/cron/stats");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const stats = await response.json();
      setData(stats);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch cron stats:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch cron stats",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Auto-refresh setiap 30 detik
    const interval = setInterval(fetchStats, 30_000);

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

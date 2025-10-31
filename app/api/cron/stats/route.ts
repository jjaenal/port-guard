import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/cache/redis";
import {
  rateLimit,
  getClientKey,
  tooManyResponse,
} from "@/lib/utils/rate-limit";

/**
 * Interface untuk cron stats metrics
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
 * GET /api/cron/stats
 *
 * Mengambil statistik eksekusi cron alerts dari Redis.
 * Endpoint ini di-rate limit untuk mencegah spam.
 *
 * @returns CronStats object dengan metrics cron
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute untuk stats endpoint
    const rateLimitResult = await rateLimit(
      getClientKey(req, "cron-stats"),
      30,
      60,
    );
    if (!rateLimitResult.allowed) {
      return tooManyResponse(rateLimitResult.resetAt);
    }

    // Ambil semua metrics dari Redis
    const [
      lastRunAt,
      alertsEvaluated,
      alertsTriggered,
      totalRuns,
      totalDurationMs,
      lastDurationMs,
    ] = await Promise.all([
      cacheGet<string>("cron:alerts:last_run_at"),
      cacheGet<string>("cron:alerts:evaluated_total"),
      cacheGet<string>("cron:alerts:triggered_total"),
      cacheGet<string>("cron:alerts:runs_total"),
      cacheGet<string>("cron:alerts:duration_total_ms"),
      cacheGet<string>("cron:alerts:last_duration_ms"),
    ]);

    // Parse dan hitung average duration
    const totalRunsNum = parseInt(totalRuns || "0", 10);
    const totalDurationMsNum = parseInt(totalDurationMs || "0", 10);
    const averageDurationMs =
      totalRunsNum > 0 ? Math.round(totalDurationMsNum / totalRunsNum) : 0;

    const stats: CronStats = {
      lastRunAt: lastRunAt || null,
      alertsEvaluated: parseInt(alertsEvaluated || "0", 10),
      alertsTriggered: parseInt(alertsTriggered || "0", 10),
      totalRuns: totalRunsNum,
      averageDurationMs,
      lastDurationMs: lastDurationMs ? parseInt(lastDurationMs, 10) : null,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[cron-stats] Error fetching cron statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch cron statistics" },
      { status: 500 },
    );
  }
}

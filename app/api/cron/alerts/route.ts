import { NextRequest } from "next/server";
import { processAlerts } from "@/lib/services/alertService";
import {
  getClientKey,
  rateLimit,
  tooManyResponse,
} from "@/lib/utils/rate-limit";
import { cacheSet, cacheGet } from "@/lib/cache/redis";

export async function GET(req: NextRequest) {
  try {
    // Cek API key untuk keamanan
    // Mendukung via header: 'x-api-key' atau 'authorization: Bearer <key>'
    // Fallback: query param 'apiKey'
    const { searchParams } = new URL(req.url);
    const queryKey = searchParams.get("apiKey");
    const headerKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization");
    const bearerKey = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : undefined;
    const apiKey = headerKey ?? bearerKey ?? queryKey;

    // Validasi API key
    if (!apiKey || apiKey !== process.env.ALERTS_CRON_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting untuk cron endpoint
    // Mencegah pemanggilan berulang terlalu cepat oleh provider cron
    const rlKey = getClientKey(req, "cron-alerts");
    const { allowed } = await rateLimit(rlKey, 12, 60); // 12 request per menit
    if (!allowed) {
      return tooManyResponse();
    }

    // Process alerts
    console.warn("[cron] Starting alerts processing"); // logging terstruktur
    const start = Date.now();
    const rawMetrics = await processAlerts();
    const metrics = rawMetrics ?? { alertsEvaluated: 0, alertsTriggered: 0 };
    const durationMs = Date.now() - start;
    console.warn(
      `[cron] Alerts processed in ${durationMs}ms - evaluated: ${metrics.alertsEvaluated}, triggered: ${metrics.alertsTriggered}`,
    );

    // Simpan metrics ke Redis untuk stats endpoint
    const now = new Date().toISOString();
    const ttlSeconds = 7 * 24 * 60 * 60; // 7 hari

    try {
      // Update counters (increment dari nilai sebelumnya)
      const [prevEvaluated, prevTriggered, prevRuns, prevTotalDuration] =
        await Promise.all([
          cacheGet<string>("cron:alerts:evaluated_total"),
          cacheGet<string>("cron:alerts:triggered_total"),
          cacheGet<string>("cron:alerts:runs_total"),
          cacheGet<string>("cron:alerts:duration_total_ms"),
        ]);

      const newEvaluatedTotal =
        parseInt(prevEvaluated || "0", 10) + metrics.alertsEvaluated;
      const newTriggeredTotal =
        parseInt(prevTriggered || "0", 10) + metrics.alertsTriggered;
      const newRunsTotal = parseInt(prevRuns || "0", 10) + 1;
      const newDurationTotal =
        parseInt(prevTotalDuration || "0", 10) + durationMs;

      // Simpan semua metrics ke Redis
      await Promise.all([
        cacheSet("cron:alerts:last_run_at", now, ttlSeconds),
        cacheSet(
          "cron:alerts:evaluated_total",
          newEvaluatedTotal.toString(),
          ttlSeconds,
        ),
        cacheSet(
          "cron:alerts:triggered_total",
          newTriggeredTotal.toString(),
          ttlSeconds,
        ),
        cacheSet("cron:alerts:runs_total", newRunsTotal.toString(), ttlSeconds),
        cacheSet(
          "cron:alerts:duration_total_ms",
          newDurationTotal.toString(),
          ttlSeconds,
        ),
        cacheSet(
          "cron:alerts:last_duration_ms",
          durationMs.toString(),
          ttlSeconds,
        ),
      ]);

      console.warn(
        `[cron] Metrics saved to Redis - total runs: ${newRunsTotal}, total evaluated: ${newEvaluatedTotal}, total triggered: ${newTriggeredTotal}`,
      );
    } catch (redisError) {
      console.error("[cron] Failed to save metrics to Redis:", redisError);
      // Tidak throw error karena proses alerts sudah berhasil
    }

    return Response.json({
      success: true,
      message: "Alerts processed successfully",
      metrics: {
        alertsEvaluated: metrics.alertsEvaluated,
        alertsTriggered: metrics.alertsTriggered,
        durationMs,
      },
    });
  } catch (error) {
    console.error("Error processing alerts:", error);
    return Response.json(
      { error: "Failed to process alerts" },
      { status: 500 },
    );
  }
}

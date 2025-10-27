import { NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
import { redis } from "@/lib/cache/redis";
import { rateLimit, getClientKey } from "@/lib/utils/rate-limit";

const prisma = new PrismaClient();

// Cache for 30 seconds
export const revalidate = 30;

export async function GET(req: Request) {
  // Rate limiting: 300 requests per minute per IP
  const rlKey = getClientKey(req, "health");
  const { remaining, resetAt } = await rateLimit(rlKey, 300, 60);

  const now = new Date().toISOString();
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | null = null;

  // Check Redis connection
  let redisStatus = "unavailable";
  const redisVersion = null;

  if (redis) {
    try {
      // Try to ping Redis
      const pingResult = await redis.ping();
      if (pingResult === "PONG") {
        redisStatus = "connected";
      }
    } catch (error) {
      redisStatus = "error";
      console.error("Redis health check error:", error);
    }
  }

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = "error";
  }

  // Get basic system info
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const nodeVersion = process.version;

  return NextResponse.json(
    {
      status: "ok",
      time: now,
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      },
      node: nodeVersion,
      services: {
        db: {
          status: dbStatus,
          latency_ms: dbLatencyMs,
        },
        redis: {
          status: redisStatus,
          version: redisVersion,
        },
      },
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(resetAt),
      },
    },
  );
}

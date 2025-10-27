import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { createErrorResponse, ErrorCodes } from "@/lib/utils/api-errors";

/**
 * Simple rate limit helper.
 * Prefers Redis if available; falls back to in-memory for dev.
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  // Try Redis first
  try {
    const cacheKey = `ratelimit:${key}`;
    const entry = await cacheGet<{ count: number; resetAt: number }>(cacheKey);
    const current = entry ?? {
      count: 0,
      resetAt: nowSeconds() + windowSeconds,
    };

    if (nowSeconds() > current.resetAt) {
      // Reset window
      current.count = 0;
      current.resetAt = nowSeconds() + windowSeconds;
    }

    if (current.count + 1 > limit) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    await cacheSet(cacheKey, current, windowSeconds);
    return {
      allowed: true,
      remaining: Math.max(0, limit - current.count),
      resetAt: current.resetAt,
    };
  } catch {
    // Fallback to memory store
    const entry = memoryStore.get(key) ?? {
      count: 0,
      resetAt: nowSeconds() + windowSeconds,
    };

    if (nowSeconds() > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = nowSeconds() + windowSeconds;
    }

    if (entry.count + 1 > limit) {
      memoryStore.set(key, entry);
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    memoryStore.set(key, entry);
    return {
      allowed: true,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
    };
  }
}

export function getClientKey(req: Request, extra?: string): string {
  const url = new URL(req.url);
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const addr = url.searchParams.get("address") || "noaddr";
  const path = url.pathname.replaceAll("/", ":");
  const suffix = extra ? `:${extra}` : "";
  return `${path}:${ip}:${addr}${suffix}`;
}

export function tooManyResponse(resetAt?: number): NextResponse {
  const resetTime = resetAt || Math.floor(Date.now() / 1000) + 60;

  return createErrorResponse(
    ErrorCodes.RATE_LIMITED,
    undefined,
    429,
    undefined,
    {
      "Retry-After": "60",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(resetTime),
    },
  );
}

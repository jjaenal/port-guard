import { NextResponse } from "next/server";
import { getLidoStethSummary } from "@/lib/defi/lido";
import { getRocketPoolSummary } from "@/lib/defi/rocket-pool";
import {
  createErrorResponse,
  ErrorCodes,
  handleUnknownError,
  validateEthereumAddress,
} from "@/lib/utils/api-errors";
import {
  rateLimit,
  getClientKey,
  tooManyResponse,
} from "@/lib/utils/rate-limit";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { CACHE_TTLS } from "@/lib/config/cache";

export const revalidate = 120; // cache 2 minutes

// GET /api/defi/rewards?address=0x...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") || "").toLowerCase();

    // Rate limiting: 30 requests per minute per IP+address+path
    const rlKey = getClientKey(req, "rewards");
    const { allowed, remaining, resetAt } = await rateLimit(rlKey, 30, 60);
    if (!allowed) {
      return tooManyResponse();
    }

    if (!address) {
      return createErrorResponse(
        ErrorCodes.MISSING_PARAMETER,
        "Address parameter is required",
        400,
      );
    }
    if (!validateEthereumAddress(address)) {
      return createErrorResponse(ErrorCodes.INVALID_ADDRESS, undefined, 400);
    }

    // Try cache first (5 minutes TTL)
    const cacheKey = `defi:rewards:${address}`;
    const cached = await cacheGet<typeof data>(cacheKey);
    if (cached) {
      return NextResponse.json(
        { data: cached },
        {
          headers: {
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(resetAt),
            "X-Cache": "HIT",
          },
        },
      );
    }

    const [lido, rocket] = await Promise.all([
      getLidoStethSummary(address as `0x${string}`),
      getRocketPoolSummary(address as `0x${string}`),
    ]);

    const lidoDaily = lido.estimatedDailyRewardsUsd ?? 0;
    const rocketDaily = rocket.estimatedDailyRewardsUsd ?? 0;
    const totalDailyUsd = lidoDaily + rocketDaily;
    const totalMonthlyUsd = totalDailyUsd * 30;

    const data = {
      totals: {
        dailyUsd: totalDailyUsd,
        monthlyUsd: totalMonthlyUsd,
      },
      breakdown: {
        lido: {
          dailyUsd: lidoDaily,
          monthlyUsd: lidoDaily * 30,
          apr: lido.apr ?? null,
          valueUsd: lido.valueUsd ?? null,
        },
        rocketPool: {
          dailyUsd: rocketDaily,
          monthlyUsd: rocketDaily * 30,
          apr: rocket.apr ?? null,
          valueUsd: rocket.valueUsd ?? null,
        },
      },
      meta: {
        address,
        source: "rewards:aggregate(lido+rocket)",
      },
    };

    // Store in cache for 5 minutes
    await cacheSet(cacheKey, data, CACHE_TTLS.DEFI_POSITIONS);

    return NextResponse.json(
      { data },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(resetAt),
          "X-Cache": "MISS",
        },
      },
    );
  } catch (err: unknown) {
    return handleUnknownError(err);
  }
}

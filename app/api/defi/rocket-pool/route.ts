import { NextResponse } from "next/server";
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

// GET /api/defi/rocket-pool?address=0x...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") || "").toLowerCase();

    // Rate limiting: 30 requests per minute per IP+address+path
    const rlKey = getClientKey(req, "rocket-pool");
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

    // Try cache first (10 minutes TTL)
    const cacheKey = `defi:rocket-pool:${address}`;
    const cached =
      await cacheGet<ReturnType<typeof getRocketPoolSummary>>(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] Rocket Pool data for ${address}`);
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

    const data = await getRocketPoolSummary(address as `0x${string}`);

    // Cache the result for 10 minutes
    await cacheSet(cacheKey, data, CACHE_TTLS.DEFI_POSITIONS);

    return NextResponse.json(
      { source: "rocket-pool:api+alchemy", data },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(resetAt),
          "X-Cache": "MISS",
        },
      },
    );
  } catch (error) {
    return handleUnknownError(error);
  }
}

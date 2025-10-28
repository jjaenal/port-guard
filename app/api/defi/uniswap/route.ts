import { NextRequest, NextResponse } from "next/server";
import { getUniswapV3Positions } from "@/lib/defi/uniswap";
import {
  rateLimit,
  getClientKey,
  tooManyResponse,
} from "@/lib/utils/rate-limit";
import {
  createErrorResponse,
  ErrorCodes,
  handleUnknownError,
  validateEthereumAddress,
} from "@/lib/utils/api-errors";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { CACHE_TTLS } from "@/lib/config/cache";

export const revalidate = 60; // cache for 60s

export async function GET(req: NextRequest) {
  // Rate limiting: 30 requests per minute per IP+address+path
  const rlKey = getClientKey(req, "uniswap");
  const { allowed, remaining, resetAt } = await rateLimit(rlKey, 30, 60);
  if (!allowed) {
    return tooManyResponse();
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) {
    return createErrorResponse(
      ErrorCodes.MISSING_PARAMETER,
      "Missing address",
      400,
    );
  }
  if (!validateEthereumAddress(address.toLowerCase())) {
    return createErrorResponse(ErrorCodes.INVALID_ADDRESS, undefined, 400);
  }

  try {
    // Try cache first (10 minutes TTL)
    const cacheKey = `defi:uniswap:${address.toLowerCase()}`;
    const cached =
      await cacheGet<ReturnType<typeof getUniswapV3Positions>>(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] Uniswap data for ${address.toLowerCase()}`);
      return NextResponse.json(
        { data: cached },
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(resetAt),
            "X-Cache": "HIT",
          },
        },
      );
    }

    const data = await getUniswapV3Positions(address as `0x${string}`);
    // Cache the result for 10 minutes
    await cacheSet(cacheKey, data, CACHE_TTLS.DEFI_POSITIONS);
    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
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

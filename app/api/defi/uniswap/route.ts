import { NextRequest, NextResponse } from "next/server";
import { getUniswapV3Positions } from "@/lib/defi/uniswap";
import { rateLimit, getClientKey, tooManyResponse } from "@/lib/utils/rate-limit";
import { createErrorResponse, ErrorCodes, handleUnknownError } from "@/lib/utils/api-errors";

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

  try {
    const data = await getUniswapV3Positions(address as `0x${string}`);
    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(resetAt),
        },
      },
    );
  } catch (err: unknown) {
    return handleUnknownError(err);
  }
}

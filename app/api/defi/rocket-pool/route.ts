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

    const data = await getRocketPoolSummary(address as `0x${string}`);
    return NextResponse.json(
      { source: "rocket-pool:api+alchemy", data },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(resetAt),
        },
      },
    );
  } catch (error) {
    return handleUnknownError(error);
  }
}

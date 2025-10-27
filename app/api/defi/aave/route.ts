import { NextResponse } from "next/server";
import { getAavePositions } from "@/lib/protocols/aave";
import {
  createErrorResponse,
  ErrorCodes,
  handleUnknownError,
  validateEthereumAddress,
  validateChains,
} from "@/lib/utils/api-errors";
import {
  rateLimit,
  getClientKey,
  tooManyResponse,
} from "@/lib/utils/rate-limit";

// Cache short-lived — The Graph data is fairly fresh; keep 2 minutes
export const revalidate = 120;

// GET /api/defi/aave?address=0x...&chains=ethereum,polygon
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") || "").toLowerCase();
    const chainsParam = searchParams.get("chains") || "ethereum,polygon";

    // Rate limiting: 30 requests per minute per IP+address+path
    const rlKey = getClientKey(req, "aave");
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

    const chains = validateChains(chainsParam);
    if (chains.length === 0) {
      return createErrorResponse(
        ErrorCodes.INVALID_PARAMETER,
        "Invalid chains. Allowed: ethereum, polygon",
        400,
      );
    }

    const summary = await getAavePositions(
      address,
      chains as ("ethereum" | "polygon")[],
    );
    return NextResponse.json(
      { source: "thegraph:aave-v3", data: summary },
      {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(resetAt),
        },
      },
    );
  } catch (err: unknown) {
    return handleUnknownError(err);
  }
}

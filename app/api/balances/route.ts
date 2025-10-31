import { NextResponse } from "next/server";
import {
  getTokenBalances,
  type TokenHolding,
  type TokenHoldingDTO,
} from "@/lib/blockchain/balances";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import {
  handleUnknownError,
  createErrorResponse,
  ErrorCodes,
  validateEthereumAddress,
  validateChains,
} from "@/lib/utils/api-errors";
import {
  rateLimit,
  getClientKey,
  tooManyResponse,
} from "@/lib/utils/rate-limit";

// Do not cache; balances depend on wallet and change frequently
export const revalidate = 0;

// Helper to convert BigInt to string for JSON serialization
function prepareBigIntForJson(tokens: TokenHolding[]): TokenHoldingDTO[] {
  return tokens.map((token) => ({
    ...token,
    // Convert bigint to string for JSON serialization
    balance: token.balance.toString(),
  }));
}

// GET /api/balances?address=0x...&chains=ethereum,polygon
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") || "").toLowerCase();
    // Default tetap ETH+Polygon; Arbitrum akan aktif ketika dipilih di param
    const chainsParam = searchParams.get("chains") || "ethereum,polygon";

    // Rate limiting: 60 requests per minute per IP+address+path
    const rlKey = getClientKey(req, "balances");
    const { allowed, remaining, resetAt } = await rateLimit(rlKey, 60, 60);
    if (!allowed) {
      return tooManyResponse();
    }

    // Validate address
    if (!address) {
      return createErrorResponse(
        ErrorCodes.MISSING_PARAMETER,
        "Address parameter is required",
      );
    }

    if (!validateEthereumAddress(address)) {
      return createErrorResponse(ErrorCodes.INVALID_ADDRESS);
    }

    // Validate and sanitize chains
    const chains = validateChains(chainsParam);

    const doEth = chains.includes("ethereum");
    const doPolygon = chains.includes("polygon");
    const doArbitrum = chains.includes("arbitrum");

    const cacheKey = `balances:${address}:${[...chains].sort().join(",")}`;
    const cached = await cacheGet<{
      address: string;
      chains: { ethereum: boolean; polygon: boolean; arbitrum: boolean };
      tokens: TokenHoldingDTO[];
      errors: Record<string, string>;
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(resetAt),
        },
      });
    }

    const results = await Promise.allSettled<TokenHolding[]>([
      doEth ? getTokenBalances(address, 1) : Promise.resolve([]),
      doPolygon ? getTokenBalances(address, 137) : Promise.resolve([]),
      doArbitrum ? getTokenBalances(address, 42161) : Promise.resolve([]),
    ]);

    const ethRes = results[0];
    const polygonRes = results[1];
    const arbitrumRes = results[2];

    const errors: Record<string, string> = {};
    const ethTokens = ethRes.status === "fulfilled" ? ethRes.value : [];
    const polygonTokens =
      polygonRes.status === "fulfilled" ? polygonRes.value : [];
    const arbitrumTokens =
      arbitrumRes?.status === "fulfilled" ? arbitrumRes.value : [];

    if (ethRes.status === "rejected") {
      errors.ethereum =
        ethRes.reason instanceof Error
          ? ethRes.reason.message
          : String(ethRes.reason);
    }
    if (polygonRes.status === "rejected") {
      errors.polygon =
        polygonRes.reason instanceof Error
          ? polygonRes.reason.message
          : String(polygonRes.reason);
    }
    if (arbitrumRes && arbitrumRes.status === "rejected") {
      errors.arbitrum =
        arbitrumRes.reason instanceof Error
          ? arbitrumRes.reason.message
          : String(arbitrumRes.reason);
    }

    const tokens = [...ethTokens, ...polygonTokens, ...arbitrumTokens].sort(
      (a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0),
    );

    // Convert BigInt to string for JSON serialization
    const serializedTokens = prepareBigIntForJson(tokens);

    const payload = {
      address,
      chains: { ethereum: doEth, polygon: doPolygon, arbitrum: doArbitrum },
      tokens: serializedTokens,
      errors,
    };

    // Cache for 3 minutes to reduce RPC pressure
    await cacheSet(cacheKey, payload, 180);

    return NextResponse.json(payload, {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(resetAt),
      },
    });
  } catch (err: unknown) {
    return handleUnknownError(err);
  }
}

import { NextResponse } from "next/server";
import {
  getTokenBalances,
  type TokenHolding,
  type TokenHoldingDTO,
} from "@/lib/blockchain/balances";

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
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get("address") || "").toLowerCase();
  const chainsParam = (
    searchParams.get("chains") || "ethereum,polygon"
  ).toLowerCase();
  const chains = chainsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const doEth = chains.includes("ethereum");
  const doPolygon = chains.includes("polygon");

  try {
    const results = await Promise.allSettled<TokenHolding[]>([
      doEth ? getTokenBalances(address, 1) : Promise.resolve([]),
      doPolygon ? getTokenBalances(address, 137) : Promise.resolve([]),
    ]);

    const ethRes = results[0];
    const polygonRes = results[1];

    const errors: Record<string, string> = {};
    const ethTokens = ethRes.status === "fulfilled" ? ethRes.value : [];
    const polygonTokens =
      polygonRes.status === "fulfilled" ? polygonRes.value : [];

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

    const tokens = [...ethTokens, ...polygonTokens].sort(
      (a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0),
    );

    // Convert BigInt to string for JSON serialization
    const serializedTokens = prepareBigIntForJson(tokens);

    return NextResponse.json({
      address,
      chains: { ethereum: doEth, polygon: doPolygon },
      tokens: serializedTokens,
      errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

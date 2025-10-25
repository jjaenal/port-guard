import { NextRequest } from "next/server";
import { getUniswapV3Positions } from "@/lib/defi/uniswap";

export const revalidate = 60; // cache for 60s

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) {
    return new Response(JSON.stringify({ error: "Missing address" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const data = await getUniswapV3Positions(address as `0x${string}`);
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch Uniswap positions";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

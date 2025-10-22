import { NextResponse } from "next/server";
import { getSimplePrices, getTokenPricesByAddress } from "@/lib/utils/coingecko";

// GET /api/prices?ids=ethereum,matic-network&vs=usd
// GET /api/prices?platform=ethereum&contracts=0x...,...&vs=usd
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");
  const platform = searchParams.get("platform");
  const contracts = searchParams.get("contracts");
  const vs = (searchParams.get("vs") || "usd").toLowerCase();

  try {
    if (ids) {
      const idList = ids.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await getSimplePrices(idList, vs);
      return NextResponse.json({ source: "coingecko:simple", data });
    }

    if (platform && contracts) {
      const addrList = contracts.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await getTokenPricesByAddress(platform, addrList, vs);
      return NextResponse.json({ source: "coingecko:contract", platform, data });
    }

    return NextResponse.json(
      { error: "Missing query. Provide `ids` or `platform`+`contracts`." },
      { status: 400 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
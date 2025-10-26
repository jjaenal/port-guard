import { NextResponse } from "next/server";
import {
  getSimplePrices,
  getTokenPricesByAddress,
  getTokenPricesByAddressWithChange,
} from "@/lib/utils/coingecko";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

// Cache configuration - 5 minutes (300 seconds)
export const revalidate = 300;

// GET /api/prices?ids=ethereum,matic-network&vs=usd
// GET /api/prices?platform=ethereum&contracts=0x...,...&vs=usd&include_24hr_change=true
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");
  const platform = searchParams.get("platform");
  const contracts = searchParams.get("contracts");
  const vs = (searchParams.get("vs") || "usd").toLowerCase();
  const include24hrChange = searchParams.get("include_24hr_change") === "true";

  try {
    if (ids) {
      const idList = ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const cacheKey = `prices:simple:${vs}:${idList.join(",")}`;
      const cached = await cacheGet<Record<string, Record<string, number>>>(cacheKey);
      if (cached) {
        return NextResponse.json({ source: "cache:simple", data: cached });
      }

      const data = await getSimplePrices(idList, vs);
      await cacheSet(cacheKey, data, 300);
      return NextResponse.json({ source: "coingecko:simple", data });
    }

    if (platform && contracts) {
      const addrList = contracts
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const cacheKey = `prices:contract:${platform}:${vs}:${include24hrChange ? "withChange" : "simple"}:${addrList.join(",")}`;
      const cached = await cacheGet<Record<string, { usd?: number; usd_24h_change?: number }>>(cacheKey);
      if (cached) {
        return NextResponse.json({ source: "cache:contract", platform, data: cached });
      }

      const data = include24hrChange
        ? await getTokenPricesByAddressWithChange(platform, addrList, vs)
        : await getTokenPricesByAddress(platform, addrList, vs);

      await cacheSet(cacheKey, data, 300);
      return NextResponse.json({
        source: "coingecko:contract",
        platform,
        data,
      });
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

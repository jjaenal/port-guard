import { NextResponse } from "next/server";
import {
  getSimplePrices,
  getTokenPricesByAddress,
  getTokenPricesByAddressWithChange,
} from "@/lib/utils/coingecko";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import { handleUnknownError, createErrorResponse, ErrorCodes } from "@/lib/utils/api-errors";
import { rateLimit, getClientKey, tooManyResponse } from "@/lib/utils/rate-limit";

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

  // Rate limiting: 120 requests per minute per IP+address+path
  const rlKey = getClientKey(req, "prices");
  const { allowed, remaining, resetAt } = await rateLimit(rlKey, 120, 60);
  if (!allowed) {
    return tooManyResponse();
  }

  try {
    if (ids) {
      const idList = ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const cacheKey = `prices:simple:${vs}:${idList.join(",")}`;
      const cached = await cacheGet<Record<string, Record<string, number>>>(cacheKey);
      if (cached) {
        return NextResponse.json(
          { source: "cache:simple", data: cached },
          {
            headers: {
              "X-RateLimit-Remaining": String(remaining),
              "X-RateLimit-Reset": String(resetAt),
            },
          },
        );
      }

      const data = await getSimplePrices(idList, vs);
      await cacheSet(cacheKey, data, 300);
      return NextResponse.json(
        { source: "coingecko:simple", data },
        {
          headers: {
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(resetAt),
          },
        },
      );
    }

    if (platform && contracts) {
      const addrList = contracts
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const cacheKey = `prices:contract:${platform}:${vs}:${include24hrChange ? "withChange" : "simple"}:${addrList.join(",")}`;
      const cached = await cacheGet<Record<string, { usd?: number; usd_24h_change?: number }>>(cacheKey);
      if (cached) {
        return NextResponse.json(
          { source: "cache:contract", platform, data: cached },
          {
            headers: {
              "X-RateLimit-Remaining": String(remaining),
              "X-RateLimit-Reset": String(resetAt),
            },
          },
        );
      }

      const data = include24hrChange
        ? await getTokenPricesByAddressWithChange(platform, addrList, vs)
        : await getTokenPricesByAddress(platform, addrList, vs);

      await cacheSet(cacheKey, data, 300);
      return NextResponse.json(
        {
          source: "coingecko:contract",
          platform,
          data,
        },
        {
          headers: {
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(resetAt),
          },
        },
      );
    }

    return createErrorResponse(
      ErrorCodes.MISSING_PARAMETER,
      "Missing query. Provide `ids` or `platform`+`contracts`.",
      400,
    );
  } catch (err: unknown) {
    return handleUnknownError(err);
  }
}

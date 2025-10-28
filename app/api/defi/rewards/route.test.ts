import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as route from "./route";

// Mock rate limit utilities to control behavior
vi.mock("@/lib/utils/rate-limit", () => {
  return {
    rateLimit: vi.fn(async () => ({
      allowed: true,
      remaining: 10,
      resetAt: Date.now(),
    })),
    getClientKey: vi.fn(() => "test-key"),
    tooManyResponse: vi.fn(
      () => new Response("Rate limit exceeded", { status: 429 }),
    ),
  };
});

// Mock Lido and Rocket Pool summaries
vi.mock("@/lib/defi/lido", () => {
  return {
    getLidoStethSummary: vi.fn(async () => ({
      chain: "ethereum",
      token: {
        address: "0x",
        symbol: "stETH",
        name: "Lido stETH",
        decimals: 18,
      },
      balance: "1",
      balanceRaw: "1000000000000000000",
      priceUsd: 3500,
      valueUsd: 3500,
      apr: 3.8,
      estimatedDailyRewardsUsd: (3500 * (3.8 / 100)) / 365,
    })),
  };
});

vi.mock("@/lib/defi/rocket-pool", () => {
  return {
    getRocketPoolSummary: vi.fn(async () => ({
      chain: "ethereum",
      token: {
        address: "0x",
        symbol: "rETH",
        name: "Rocket Pool ETH",
        decimals: 18,
      },
      balance: "2",
      balanceRaw: "2000000000000000000",
      priceUsd: 3500,
      valueUsd: 7000,
      apr: 3.2,
      estimatedDailyRewardsUsd: (7000 * (3.2 / 100)) / 365,
    })),
  };
});

describe("/api/defi/rewards route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports GET handler", () => {
    expect(route.GET).toBeDefined();
  });

  it("returns 400 when address is missing", async () => {
    const res = await route.GET(
      new NextRequest("http://localhost/api/defi/rewards"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_PARAMETER");
  });

  it("returns 400 for invalid address format", async () => {
    const res = await route.GET(
      new NextRequest(
        "http://localhost/api/defi/rewards?address=not-an-address",
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_ADDRESS");
  });

  it("returns 429 when rate limited", async () => {
    const rl = await import("@/lib/utils/rate-limit");
    (rl.rateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      {
        allowed: false,
        remaining: 0,
        resetAt: Date.now(),
      },
    );
    const res = await route.GET(
      new NextRequest(
        "http://localhost/api/defi/rewards?address=0x0000000000000000000000000000000000000000",
      ),
    );
    expect(res.status).toBe(429);
  });

  it("aggregates daily and monthly rewards", async () => {
    const res = await route.GET(
      new NextRequest(
        "http://localhost/api/defi/rewards?address=0x0000000000000000000000000000000000000000",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data;
    expect(data?.totals?.dailyUsd).toBeGreaterThan(0);
    expect(data?.totals?.monthlyUsd).toBeCloseTo(
      (data?.totals?.dailyUsd || 0) * 30,
    );
    expect(data?.breakdown?.lido?.dailyUsd).toBeGreaterThan(0);
    expect(data?.breakdown?.rocketPool?.dailyUsd).toBeGreaterThan(0);
  });
});

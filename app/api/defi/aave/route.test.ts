import { describe, it, expect, vi, beforeEach } from "vitest";
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

// Mock Aave positions to avoid network
vi.mock("@/lib/protocols/aave", () => {
  return {
    getAavePositions: vi.fn(async () => ({
      chains: [],
      totals: { suppliedCount: 0, borrowedCount: 0 },
    })),
  };
});

describe("/api/defi/aave route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports GET handler", () => {
    expect(route.GET).toBeDefined();
  });

  it("returns 400 when address is missing", async () => {
    const res = await route.GET(new Request("http://localhost/api/defi/aave"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_PARAMETER");
  });

  it("returns 400 for invalid address format", async () => {
    const res = await route.GET(
      new Request(
        "http://localhost/api/defi/aave?address=not-an-address&chains=ethereum",
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
      new Request(
        "http://localhost/api/defi/aave?address=0x0000000000000000000000000000000000000000&chains=ethereum",
      ),
    );
    expect(res.status).toBe(429);
  });
});

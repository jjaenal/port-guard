import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRocketPoolSummary } from "./rocket-pool";

const RETH = "0xae78736cd615f374d3085123a210448e74fc6393";

describe("Rocket Pool rETH util", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch as unknown as typeof fetch;
  });

  it("returns data with zero balance when no Alchemy key", async () => {
    delete process.env.ALCHEMY_API_KEY_ETHEREUM;
    delete process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ETHEREUM;
    delete process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/prices")) {
        return {
          ok: true,
          json: async () => ({
            data: { [RETH.toLowerCase()]: { usd: 3500 } },
          }),
        } as Response;
      }
      return {
        ok: false,
        json: async () => ({}),
      } as Response;
    });

    const res = await getRocketPoolSummary(
      "0x1234567890123456789012345678901234567890",
    );

    expect(res.token.symbol).toBe("rETH");
    expect(res.balance).toBe("0");
    expect(res.balanceRaw).toBe("0");
    expect(res.priceUsd).toBe(3500);
    expect(res.valueUsd).toBe(0);
    // APR is a fixed estimate in adapter, but with zero value rewards are undefined
    expect(res.apr).toBeDefined();
    expect(res.estimatedDailyRewardsUsd).toBeUndefined();
  });

  it("computes value and rewards when Alchemy + prices available", async () => {
    process.env.ALCHEMY_API_KEY_ETHEREUM = "test";

    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        // Alchemy RPC: token balances and metadata
        if (url.includes("alchemy.com/v2/test") && init?.method === "POST") {
          const body = JSON.parse(String(init?.body || "{}"));
          if (body?.method === "alchemy_getTokenBalances") {
            return {
              ok: true,
              json: async () => ({
                result: {
                  tokenBalances: [
                    {
                      contractAddress: RETH,
                      tokenBalance: "2000000000000000000", // 2 rETH
                    },
                  ],
                },
              }),
            } as Response;
          }
          if (body?.method === "alchemy_getTokenMetadata") {
            return {
              ok: true,
              json: async () => ({
                result: {
                  name: "Rocket Pool ETH",
                  symbol: "rETH",
                  decimals: 18,
                },
              }),
            } as Response;
          }
        }
        // Prices API
        if (url.includes("/api/prices")) {
          return {
            ok: true,
            json: async () => ({
              data: { [RETH.toLowerCase()]: { usd: 3500 } },
            }),
          } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      },
    );

    const res = await getRocketPoolSummary(
      "0x1234567890123456789012345678901234567890",
    );

    expect(res.token.address.toLowerCase()).toBe(RETH);
    expect(res.balanceRaw).toBe("2000000000000000000");
    expect(Number(res.balance)).toBeCloseTo(2);
    expect(res.priceUsd).toBe(3500);
    expect(res.valueUsd).toBeCloseTo(7000);
    expect(typeof res.apr).toBe("number");
    const apr = res.apr || 0;
    expect(res.estimatedDailyRewardsUsd).toBeCloseTo(
      (7000 * (apr / 100)) / 365,
      6,
    );
  });
});

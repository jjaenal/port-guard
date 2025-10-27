import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLidoStethSummary } from "./lido";

const STETH = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";

describe("Lido stETH util", () => {
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
            data: { [STETH.toLowerCase()]: { usd: 3500 } },
          }),
        } as Response;
      }
      if (url.includes("eth-api.lido.fi")) {
        return {
          ok: true,
          json: async () => ({ apr: 3.5 }),
        } as Response;
      }
      // No Alchemy RPC calls expected when key missing
      return {
        ok: false,
        json: async () => ({}),
      } as Response;
    });

    const res = await getLidoStethSummary(
      "0x1234567890123456789012345678901234567890",
    );

    expect(res.token.symbol).toBe("stETH");
    expect(res.balance).toBe("0");
    expect(res.balanceRaw).toBe("0");
    expect(res.priceUsd).toBe(3500);
    expect(res.valueUsd).toBe(0);
    expect(res.apr).toBe(3.5);
    expect(res.estimatedDailyRewardsUsd).toBeUndefined();
  });

  it("computes value and rewards when Alchemy + prices + APR available", async () => {
    process.env.ALCHEMY_API_KEY_ETHEREUM = "test";

    global.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        // Alchemy RPC: token balances
        if (url.includes("alchemy.com/v2/test") && init?.method === "POST") {
          const body = JSON.parse(String(init?.body || "{}"));
          if (body?.method === "alchemy_getTokenBalances") {
            return {
              ok: true,
              json: async () => ({
                result: {
                  tokenBalances: [
                    {
                      contractAddress: STETH,
                      tokenBalance: "1000000000000000000",
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
                  name: "Lido Staked Ether",
                  symbol: "stETH",
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
              data: { [STETH.toLowerCase()]: { usd: 3500 } },
            }),
          } as Response;
        }
        // APR API
        if (url.includes("eth-api.lido.fi")) {
          return { ok: true, json: async () => ({ apr: 3.65 }) } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      },
    );

    const res = await getLidoStethSummary(
      "0x1234567890123456789012345678901234567890",
    );

    expect(res.token.address.toLowerCase()).toBe(STETH);
    expect(res.balanceRaw).toBe("1000000000000000000");
    expect(Number(res.balance)).toBeCloseTo(1);
    expect(res.priceUsd).toBe(3500);
    expect(res.valueUsd).toBeCloseTo(3500);
    expect(res.apr).toBe(3.65);
    expect(res.estimatedDailyRewardsUsd).toBeCloseTo((3500 * 0.0365) / 365, 6);
  });
});

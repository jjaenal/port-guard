import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTokenPricesByAddress } from "./coingecko";

const mockResponse = {
  "0x1234567890abcdef1234567890abcdef12345678": { usd: 1.23 },
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd": { usd: 0.05 },
};

type MinimalResponse = {
  ok: boolean;
  json: () => Promise<typeof mockResponse>;
};

describe("getTokenPricesByAddress", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (): Promise<MinimalResponse> => {
        return {
          ok: true,
          json: async () => mockResponse,
        } as MinimalResponse;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches prices by contract addresses for a platform", async () => {
    const platform = "ethereum";
    const addresses = Object.keys(mockResponse);
    const res = await getTokenPricesByAddress(platform, addresses);
    expect(res[addresses[0]].usd).toBe(1.23);
    expect(res[addresses[1]].usd).toBe(0.05);
  });

  it("returns empty object when addresses are empty", async () => {
    const res = await getTokenPricesByAddress("ethereum", []);
    expect(Object.keys(res).length).toBe(0);
  });
});

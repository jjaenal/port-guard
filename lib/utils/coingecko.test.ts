import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSimplePrices, type SimplePriceResponse } from "./coingecko";

describe("CoinGecko Utils", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getSimplePrices", () => {
    it("fetches prices correctly with default currency", async () => {
      // Mock data
      const mockResponse: SimplePriceResponse = {
        ethereum: { usd: 3500, usd_24h_change: 2.5 },
        "matic-network": { usd: 0.75, usd_24h_change: -1.2 },
      };

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Call function
      const result = await getSimplePrices(["ethereum", "matic-network"]);

      // Assertions
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "ids=ethereum%2Cmatic-network&vs_currencies=usd",
        ),
        expect.anything(),
      );
      expect(result).toEqual(mockResponse);
      expect(result.ethereum.usd).toBe(3500);
      expect(result["matic-network"].usd_24h_change).toBe(-1.2);
    });

    it("handles API errors gracefully", async () => {
      // Mock fetch error response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      // Call and expect error
      await expect(getSimplePrices(["ethereum"])).rejects.toThrow(
        "CoinGecko request failed: 429",
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("supports custom currency parameter", async () => {
      // Mock data
      const mockResponse = {
        ethereum: { eur: 3200 },
      };

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Call function with EUR
      await getSimplePrices(["ethereum"], "eur");

      // Assertions
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("vs_currencies=eur"),
        expect.anything(),
      );
    });
  });
});

import { describe, it, expect } from "vitest";
import { cacheTitle } from "./cache";

describe("Cache Utils", () => {
  describe("cacheTitle", () => {
    it("formats TTL correctly for different minute values", () => {
      expect(cacheTitle(3)).toBe("Cached • TTL 3m");
      expect(cacheTitle(5)).toBe("Cached • TTL 5m");
      expect(cacheTitle(10)).toBe("Cached • TTL 10m");
    });

    it("handles single digit minutes", () => {
      expect(cacheTitle(1)).toBe("Cached • TTL 1m");
      expect(cacheTitle(9)).toBe("Cached • TTL 9m");
    });

    it("handles double digit minutes", () => {
      expect(cacheTitle(15)).toBe("Cached • TTL 15m");
      expect(cacheTitle(30)).toBe("Cached • TTL 30m");
    });

    it("handles zero minutes", () => {
      expect(cacheTitle(0)).toBe("Cached • TTL 0m");
    });
  });
});

import { describe, it, expect } from "vitest";
import * as route from "./route";

// Minimal test to ensure API route is defined
describe("/api/alerts route", () => {
  describe("Route handlers", () => {
    it("should export GET handler", () => {
      expect(route.GET).toBeDefined();
      expect(typeof route.GET).toBe("function");
    });

    it("should export POST handler", () => {
      expect(route.POST).toBeDefined();
      expect(typeof route.POST).toBe("function");
    });

    it("should export PATCH handler", () => {
      expect(route.PATCH).toBeDefined();
      expect(typeof route.PATCH).toBe("function");
    });

    it("should export DELETE handler", () => {
      expect(route.DELETE).toBeDefined();
      expect(typeof route.DELETE).toBe("function");
    });
  });
});

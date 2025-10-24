import { describe, it, expect } from "vitest";
import { useTokenHoldings } from "./useTokenHoldings";

// Minimal test to ensure hook can be imported
describe("useTokenHoldings Hook", () => {
  it("should be defined", () => {
    expect(useTokenHoldings).toBeDefined();
  });
});

import { describe, it, expect } from "vitest";
import { useNativeBalances } from "./useNativeBalances";

// Minimal test untuk memastikan hook bisa diimpor
describe("useNativeBalances Hook", () => {
  it("should be defined", () => {
    expect(useNativeBalances).toBeDefined();
  });
});

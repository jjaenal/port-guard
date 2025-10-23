import { describe, it, expect } from "vitest";
import * as route from "./route";

// Minimal test to ensure API route is defined
describe("/api/balances route", () => {
  it("should export GET handler", () => {
    expect(route.GET).toBeDefined();
  });
});

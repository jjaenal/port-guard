import { describe, it, expect } from "vitest";
import { categorizeTransaction, formatTimestamp } from "./transactions";

describe("transactions utils", () => {
  it("categorizes send when address is sender", () => {
    const cat = categorizeTransaction(
      { from: "0xabc", to: "0xdef" },
      "0xAbC",
    );
    expect(cat).toBe("send");
  });

  it("categorizes receive when address is recipient", () => {
    const cat = categorizeTransaction(
      { from: "0xdef", to: "0xabc" },
      "0xAbC",
    );
    expect(cat).toBe("receive");
  });

  it("categorizes unknown when ambiguous", () => {
    const cat = categorizeTransaction({ from: "", to: "" }, "0xAbC");
    expect(cat).toBe("unknown");
  });

  it("formats timestamp to readable string", () => {
    const s = formatTimestamp(1730096400); // arbitrary
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });
});
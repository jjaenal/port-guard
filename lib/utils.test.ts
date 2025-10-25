import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatPercentSigned,
  formatCurrencyTiny,
  cn,
} from "./utils";

describe("utils formatting", () => {
  it("formatCurrency with standard notation formats dollars", () => {
    const s = formatCurrency(1234.56, { notation: "standard" });
    expect(s).toMatch(/\$1,234\.56/);
  });

  it("formatNumber with standard notation formats number", () => {
    const s = formatNumber(1234.56, { notation: "standard" });
    expect(s).toMatch(/1,234\.56/);
  });

  it("formatPercentSigned shows plus sign for positive and divides by 100", () => {
    const s = formatPercentSigned(12.34);
    expect(s).toMatch(/^\+?12\.34%$/);
  });

  it("formatPercentSigned shows minus sign for negative", () => {
    const s = formatPercentSigned(-5);
    expect(s).toMatch(/^\-5(\.00)?%$/);
  });

  it("formatCurrencyTiny returns < threshold for tiny positive numbers", () => {
    const s = formatCurrencyTiny(0.005, 0.01);
    expect(s).toBe("<$0.01");
  });

  it("formatCurrencyTiny delegates to formatCurrency for normal values", () => {
    const s = formatCurrencyTiny(0.02, 0.01);
    expect(s).toMatch(/\$0\.0?2/);
  });
});

describe("utils cn", () => {
  it("cn merges classnames correctly", () => {
    const s = cn("px-2", "py-1", "text-sm", false && "hidden");
    expect(s).toBe("px-2 py-1 text-sm");
  });
});

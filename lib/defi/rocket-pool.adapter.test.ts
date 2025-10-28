import { describe, it, expect } from "vitest";
import { RocketPoolAdapter } from "./rocket-pool";

describe("RocketPoolAdapter.calculateRewards", () => {
  const adapter = new RocketPoolAdapter();

  it("calculates daily, monthly, annual rewards correctly", () => {
    const balance = 10; // 10 rETH
    const apr = 3.65; // percent

    const rewards = adapter.calculateRewards(balance, apr);

    // Annual = balance * (apr/100)
    const expectedAnnual = balance * (apr / 100);
    const expectedDaily = expectedAnnual / 365;
    const expectedMonthly = expectedDaily * 30;

    expect(rewards.annual).toBeCloseTo(expectedAnnual, 10);
    expect(rewards.daily).toBeCloseTo(expectedDaily, 10);
    expect(rewards.monthly).toBeCloseTo(expectedMonthly, 10);
  });

  it("returns zeros for zero balance or zero APR", () => {
    const r1 = adapter.calculateRewards(0, 5);
    expect(r1.annual).toBe(0);
    expect(r1.daily).toBe(0);
    expect(r1.monthly).toBe(0);

    const r2 = adapter.calculateRewards(100, 0);
    expect(r2.annual).toBe(0);
    expect(r2.daily).toBe(0);
    expect(r2.monthly).toBe(0);
  });
});

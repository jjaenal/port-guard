import { describe, it, expect } from "vitest";
import type { NotificationPreferences } from "@/types/notifications";
import { isPreferencesDirty } from "./notifications";

const base: NotificationPreferences = {
  enabled: true,
  channels: { email: false, browser: true },
  alerts: { price: true, portfolio: true, liquidation: true },
  updatedAt: 0,
};

describe("isPreferencesDirty", () => {
  it("returns false when preferences are identical", () => {
    expect(isPreferencesDirty(base, base)).toBe(false);
  });

  it("detects change in enabled", () => {
    const next = { ...base, enabled: false };
    expect(isPreferencesDirty(next, base)).toBe(true);
  });

  it("detects change in channels.email", () => {
    const next = { ...base, channels: { ...base.channels, email: true } };
    expect(isPreferencesDirty(next, base)).toBe(true);
  });

  it("detects change in channels.browser", () => {
    const next = { ...base, channels: { ...base.channels, browser: false } };
    expect(isPreferencesDirty(next, base)).toBe(true);
  });

  it("detects change in alerts.price", () => {
    const next = { ...base, alerts: { ...base.alerts, price: false } };
    expect(isPreferencesDirty(next, base)).toBe(true);
  });

  it("detects change in alerts.portfolio", () => {
    const next = { ...base, alerts: { ...base.alerts, portfolio: false } };
    expect(isPreferencesDirty(next, base)).toBe(true);
  });

  it("detects change in alerts.liquidation", () => {
    const next = { ...base, alerts: { ...base.alerts, liquidation: false } };
    expect(isPreferencesDirty(next, base)).toBe(true);
  });
});

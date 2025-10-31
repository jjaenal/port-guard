import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as route from "./route";

// Mock rate-limit util agar deterministik di test
vi.mock("@/lib/utils/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 10,
    resetAt: Date.now(),
  })),
  getClientKey: vi.fn(() => "test-client"),
  tooManyResponse: vi.fn(() => new Response("Too many", { status: 429 })),
}));

// Mock Redis cache layer
vi.mock("@/lib/cache/redis", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

describe("/api/notifications/preferences route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export GET and PUT handlers", () => {
    expect(route.GET).toBeDefined();
    expect(typeof route.GET).toBe("function");
    expect(route.PUT).toBeDefined();
    expect(typeof route.PUT).toBe("function");
  });

  describe("GET /api/notifications/preferences", () => {
    it("returns 400 for invalid address", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/notifications/preferences?address=not-an-address",
      );
      const res = await route.GET(req);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe("INVALID_ADDRESS");
    });

    it("returns default preferences when none stored", async () => {
      const { cacheGet } = await import("@/lib/cache/redis");
      vi.mocked(cacheGet).mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost:3000/api/notifications/preferences?address=0x1234567890123456789012345678901234567890",
      );
      const res = await route.GET(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.preferences).toBeDefined();
      expect(body.preferences.channels.browser).toBe(true);
    });

    it("returns 429 when rate limited", async () => {
      const rl = await import("@/lib/utils/rate-limit");
      vi.mocked(rl.rateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now(),
      });

      const req = new NextRequest(
        "http://localhost:3000/api/notifications/preferences?address=0x1234567890123456789012345678901234567890",
      );
      const res = await route.GET(req);
      expect(res.status).toBe(429);
    });
  });

  describe("PUT /api/notifications/preferences", () => {
    const addr = "0x1234567890123456789012345678901234567890";

    it("returns 400 for invalid address", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/notifications/preferences?address=badd",
      );
      const res = await route.PUT(req);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe("INVALID_ADDRESS");
    });

    it("returns 400 for invalid JSON body", async () => {
      // Buat request dengan content-type bukan JSON agar parsing gagal
      const req = new NextRequest(
        `http://localhost:3000/api/notifications/preferences?address=${addr}`,
        {
          method: "PUT",
          headers: new Headers({ "content-type": "text/plain" }),
          body: "not-json",
        },
      );

      const res = await route.PUT(req);
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("stores preferences via Redis and returns saved data", async () => {
      const { cacheSet } = await import("@/lib/cache/redis");

      const payload = {
        enabled: false,
        channels: { email: true, browser: false },
        alerts: { price: true, portfolio: false, liquidation: true },
      };

      const req = new NextRequest(
        `http://localhost:3000/api/notifications/preferences?address=${addr}`,
        {
          method: "PUT",
          headers: new Headers({ "content-type": "application/json" }),
          body: JSON.stringify(payload),
        },
      );

      const res = await route.PUT(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.preferences.enabled).toBe(false);
      expect(body.preferences.channels.email).toBe(true);

      expect(cacheSet).toHaveBeenCalledTimes(1);
      const call = vi.mocked(cacheSet).mock.calls[0];
      expect(call[0]).toContain("notifications:preferences:");
      expect(typeof call[2]).toBe("number");
    });

    it("returns 429 when rate limited on PUT", async () => {
      const rl = await import("@/lib/utils/rate-limit");
      vi.mocked(rl.rateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/notifications/preferences?address=${addr}`,
        {
          method: "PUT",
          headers: new Headers({ "content-type": "application/json" }),
          body: JSON.stringify({ enabled: true }),
        },
      );
      const res = await route.PUT(req);
      expect(res.status).toBe(429);
    });
  });
});

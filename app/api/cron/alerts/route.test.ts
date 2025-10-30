import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as route from "./route";

// Mock dependencies
vi.mock("@/lib/services/alertService", () => ({
  processAlerts: vi.fn(),
}));
vi.mock("@/lib/utils/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 10, resetAt: Date.now() })),
  getClientKey: vi.fn(() => "test-key"),
  tooManyResponse: vi.fn(() => new Response("Rate limit exceeded", { status: 429 })),
}));

describe("/api/cron/alerts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.ALERTS_CRON_API_KEY;
  });

  describe("Route handlers", () => {
    it("should export GET handler", () => {
      expect(route.GET).toBeDefined();
      expect(typeof route.GET).toBe("function");
    });
  });

  describe("GET /api/cron/alerts", () => {
    it("should return 401 when API key is not configured", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/alerts");
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when API key is missing from request", async () => {
      process.env.ALERTS_CRON_API_KEY = "test-api-key";

      const req = new NextRequest("http://localhost:3000/api/cron/alerts");
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when API key is invalid", async () => {
      process.env.ALERTS_CRON_API_KEY = "correct-api-key";

      const req = new NextRequest(
        "http://localhost:3000/api/cron/alerts?apiKey=wrong-api-key",
      );
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should process alerts when API key is valid", async () => {
      process.env.ALERTS_CRON_API_KEY = "test-api-key";

      const { processAlerts } = await import("@/lib/services/alertService");
      // Kembalikan metrics minimal agar sesuai tipe Promise<AlertProcessingMetrics>
      vi.mocked(processAlerts).mockResolvedValue({ alertsEvaluated: 0, alertsTriggered: 0 });

      const req = new NextRequest(
        "http://localhost:3000/api/cron/alerts?apiKey=test-api-key",
      );
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Alerts processed successfully");
      expect(processAlerts).toHaveBeenCalledOnce();
    });

    it("should process alerts when API key is provided via x-api-key header", async () => {
      process.env.ALERTS_CRON_API_KEY = "header-key";

      const { processAlerts } = await import("@/lib/services/alertService");
      // Kembalikan metrics minimal
      vi.mocked(processAlerts).mockResolvedValue({ alertsEvaluated: 0, alertsTriggered: 0 });

      const req = new NextRequest("http://localhost:3000/api/cron/alerts", {
        headers: new Headers({ "x-api-key": "header-key" }),
      });
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Alerts processed successfully");
      expect(processAlerts).toHaveBeenCalledOnce();
    });

    it("should process alerts when API key is provided via Authorization Bearer header", async () => {
      process.env.ALERTS_CRON_API_KEY = "bearer-key";

      const { processAlerts } = await import("@/lib/services/alertService");
      // Kembalikan metrics minimal
      vi.mocked(processAlerts).mockResolvedValue({ alertsEvaluated: 0, alertsTriggered: 0 });

      const req = new NextRequest("http://localhost:3000/api/cron/alerts", {
        headers: new Headers({ Authorization: "Bearer bearer-key" }),
      });
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Alerts processed successfully");
      expect(processAlerts).toHaveBeenCalledOnce();
    });

    it("should return 401 when x-api-key header is invalid", async () => {
      process.env.ALERTS_CRON_API_KEY = "correct-key";

      const req = new NextRequest("http://localhost:3000/api/cron/alerts", {
        headers: new Headers({ "x-api-key": "wrong-key" }),
      });
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should handle processAlerts errors gracefully", async () => {
      process.env.ALERTS_CRON_API_KEY = "test-api-key";

      const { processAlerts } = await import("@/lib/services/alertService");
      vi.mocked(processAlerts).mockRejectedValue(new Error("Database error"));

      const req = new NextRequest(
        "http://localhost:3000/api/cron/alerts?apiKey=test-api-key",
      );
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to process alerts");
      expect(processAlerts).toHaveBeenCalledOnce();
    });

    it("should handle missing API key in query params", async () => {
      process.env.ALERTS_CRON_API_KEY = "test-api-key";

      // Test without apiKey query parameter
      const req = new NextRequest("http://localhost:3000/api/cron/alerts");
      const response = await route.GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 429 when rate limited", async () => {
      process.env.ALERTS_CRON_API_KEY = "test-api-key";

      const rl = await import("@/lib/utils/rate-limit");
      vi.mocked(rl.rateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() });

      const req = new NextRequest(
        "http://localhost:3000/api/cron/alerts?apiKey=test-api-key",
      );
      const response = await route.GET(req);
      expect(response.status).toBe(429);
    });
  });

  describe("Metrics storage", () => {
    beforeEach(() => {
      vi.mock("@/lib/cache/redis", () => ({
        cacheGet: vi.fn(),
        cacheSet: vi.fn(),
      }));
      process.env.ALERTS_CRON_API_KEY = "test-api-key";
    });

    it("should store metrics in Redis after processing alerts", async () => {
      // Import mocked dependencies
      const { processAlerts } = await import("@/lib/services/alertService");
      const { cacheGet, cacheSet } = await import("@/lib/cache/redis");

      // Mock processAlerts to return metrics
      vi.mocked(processAlerts).mockResolvedValue({ 
        alertsEvaluated: 10, 
        alertsTriggered: 3 
      });

      // Mock existing Redis values
      vi.mocked(cacheGet).mockImplementation((key: string) => {
        switch (key) {
          case 'cron:alerts:evaluated_total': return Promise.resolve('20');
          case 'cron:alerts:triggered_total': return Promise.resolve('5');
          case 'cron:alerts:runs_total': return Promise.resolve('3');
          case 'cron:alerts:duration_total_ms': return Promise.resolve('1500');
          default: return Promise.resolve(null);
        }
      });

      // Execute request
      const req = new NextRequest(
        "http://localhost:3000/api/cron/alerts?apiKey=test-api-key"
      );
      const response = await route.GET(req);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.metrics).toEqual(expect.objectContaining({
        alertsEvaluated: 10,
        alertsTriggered: 3,
        durationMs: expect.any(Number)
      }));

      // Verify Redis metrics were updated correctly
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:last_run_at', expect.any(String), expect.any(Number));
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:evaluated_total', '30', expect.any(Number)); // 20 + 10
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:triggered_total', '8', expect.any(Number)); // 5 + 3
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:runs_total', '4', expect.any(Number)); // 3 + 1
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:duration_total_ms', expect.any(String), expect.any(Number));
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:last_duration_ms', expect.any(String), expect.any(Number));
    });

    it("should initialize metrics when no previous data exists", async () => {
      // Import mocked dependencies
      const { processAlerts } = await import("@/lib/services/alertService");
      const { cacheGet, cacheSet } = await import("@/lib/cache/redis");

      // Mock processAlerts to return metrics
      vi.mocked(processAlerts).mockResolvedValue({ 
        alertsEvaluated: 5, 
        alertsTriggered: 2 
      });

      // Mock Redis returning null (no previous data)
      vi.mocked(cacheGet).mockResolvedValue(null);

      // Execute request
      const req = new NextRequest(
        "http://localhost:3000/api/cron/alerts?apiKey=test-api-key"
      );
      await route.GET(req);

      // Verify Redis metrics were initialized correctly
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:evaluated_total', '5', expect.any(Number));
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:triggered_total', '2', expect.any(Number));
      expect(cacheSet).toHaveBeenCalledWith('cron:alerts:runs_total', '1', expect.any(Number));
    });

    it("should handle Redis errors gracefully", async () => {
      // Import mocked dependencies
      const { processAlerts } = await import("@/lib/services/alertService");
      const { cacheGet } = await import("@/lib/cache/redis");

      // Mock processAlerts to return metrics
      vi.mocked(processAlerts).mockResolvedValue({ 
        alertsEvaluated: 5, 
        alertsTriggered: 2 
      });

      // Mock Redis throwing an error
      vi.mocked(cacheGet).mockRejectedValue(new Error("Redis connection failed"));

      // Execute request
      const req = new NextRequest(
        "http://localhost:3000/api/cron/alerts?apiKey=test-api-key"
      );
      const response = await route.GET(req);
      const data = await response.json();

      // Verify response is still successful despite Redis error
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
    });
  });
});

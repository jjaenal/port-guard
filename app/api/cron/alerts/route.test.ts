import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as route from "./route";

// Mock dependencies
vi.mock("@/lib/services/alertService", () => ({
  processAlerts: vi.fn(),
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
      vi.mocked(processAlerts).mockResolvedValue();

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
      vi.mocked(processAlerts).mockResolvedValue();

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
      vi.mocked(processAlerts).mockResolvedValue();

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
  });
});

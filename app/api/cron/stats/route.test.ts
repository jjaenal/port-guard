import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/cache/redis", () => ({
  cacheGet: vi.fn(),
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  rateLimit: vi.fn(),
  getClientKey: vi.fn(),
  tooManyResponse: vi.fn(),
}));

const { cacheGet } = await import("@/lib/cache/redis");
const { rateLimit, getClientKey, tooManyResponse } = await import(
  "@/lib/utils/rate-limit"
);

describe("/api/cron/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return cron stats successfully", async () => {
    // Mock rate limit - allowed
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60000,
    });
    vi.mocked(getClientKey).mockReturnValue("test-key");

    // Mock Redis data
    vi.mocked(cacheGet)
      .mockResolvedValueOnce("2024-01-15T10:30:00.000Z") // last_run_at
      .mockResolvedValueOnce("150") // evaluated_total
      .mockResolvedValueOnce("12") // triggered_total
      .mockResolvedValueOnce("5") // runs_total
      .mockResolvedValueOnce("2500") // duration_total_ms
      .mockResolvedValueOnce("450"); // last_duration_ms

    const request = new NextRequest("http://localhost:3000/api/cron/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      lastRunAt: "2024-01-15T10:30:00.000Z",
      alertsEvaluated: 150,
      alertsTriggered: 12,
      totalRuns: 5,
      averageDurationMs: 500, // 2500 / 5
      lastDurationMs: 450,
    });

    // Verify rate limit was called correctly
    expect(rateLimit).toHaveBeenCalledWith("test-key", 30, 60);
  });

  it("should return empty stats when no data in Redis", async () => {
    // Mock rate limit - allowed
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60000,
    });

    // Mock Redis - no data (all null)
    vi.mocked(cacheGet).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/cron/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      lastRunAt: null,
      alertsEvaluated: 0,
      alertsTriggered: 0,
      totalRuns: 0,
      averageDurationMs: 0,
      lastDurationMs: null,
    });
  });

  it("should handle rate limit exceeded", async () => {
    // Mock rate limit - not allowed
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });
    vi.mocked(tooManyResponse).mockReturnValue(
      NextResponse.json({ error: "Too Many Requests" }, { status: 429 }),
    );

    const request = new NextRequest("http://localhost:3000/api/cron/stats");
    const response = await GET(request);

    expect(response.status).toBe(429);
    expect(tooManyResponse).toHaveBeenCalledWith(expect.any(Number));
  });

  it("should handle Redis errors gracefully", async () => {
    // Mock rate limit - allowed
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60000,
    });

    // Mock Redis error
    vi.mocked(cacheGet).mockRejectedValue(new Error("Redis connection failed"));

    const request = new NextRequest("http://localhost:3000/api/cron/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch cron statistics",
    });
  });

  it("should calculate average duration correctly with zero runs", async () => {
    // Mock rate limit - allowed
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60000,
    });

    // Mock Redis data with zero runs
    vi.mocked(cacheGet)
      .mockResolvedValueOnce(null) // last_run_at
      .mockResolvedValueOnce("0") // evaluated_total
      .mockResolvedValueOnce("0") // triggered_total
      .mockResolvedValueOnce("0") // runs_total
      .mockResolvedValueOnce("0") // duration_total_ms
      .mockResolvedValueOnce(null); // last_duration_ms

    const request = new NextRequest("http://localhost:3000/api/cron/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.averageDurationMs).toBe(0);
  });

  it("should parse string values correctly", async () => {
    // Mock rate limit - allowed
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: Date.now() + 60000,
    });

    // Mock Redis data with string values
    vi.mocked(cacheGet)
      .mockResolvedValueOnce("2024-01-15T10:30:00.000Z")
      .mockResolvedValueOnce("100")
      .mockResolvedValueOnce("5")
      .mockResolvedValueOnce("2")
      .mockResolvedValueOnce("1000")
      .mockResolvedValueOnce("500");

    const request = new NextRequest("http://localhost:3000/api/cron/stats");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(typeof data.alertsEvaluated).toBe("number");
    expect(typeof data.alertsTriggered).toBe("number");
    expect(typeof data.totalRuns).toBe("number");
    expect(typeof data.averageDurationMs).toBe("number");
    expect(typeof data.lastDurationMs).toBe("number");
  });
});

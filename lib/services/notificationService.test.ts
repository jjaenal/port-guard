import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendEmail, buildAlertEmailHtml } from "./notificationService";

describe("notificationService - sendEmail", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.RESEND_API_KEY = "test_key";
    process.env.RESEND_FROM_EMAIL = "alerts@test.app";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("sends email successfully via Resend", async () => {
    const calls: Array<{ url: RequestInfo; init?: RequestInit }> = [];
    const mockResponse: Partial<Response> = {
      ok: true,
      json: async () => ({ id: "email_123" }) as unknown,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo, init?: RequestInit) => {
        calls.push({ url, init });
        return mockResponse as unknown as Response;
      }),
    );

    const html = buildAlertEmailHtml("Price Alert", "ETH above $3,000");
    const result = await sendEmail({
      to: ["user@example.com"],
      subject: "Alert: ETH Price",
      html,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("email_123");
    expect(calls).toHaveLength(1);

    const { url, init } = calls[0];
    expect(String(url)).toContain("api.resend.com/emails");
    expect(init?.method).toBe("POST");
    // Validate headers
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toMatch(/^Bearer\s+test_key$/);
    expect(headers?.["Content-Type"]).toBe("application/json");
    // Validate body
    const parsed = JSON.parse(String(init?.body));
    expect(parsed.from).toBe("alerts@test.app");
    expect(parsed.to).toEqual(["user@example.com"]);
    expect(parsed.subject).toBe("Alert: ETH Price");
    expect(parsed.html).toContain("Price Alert");
  });

  it("returns failure when Resend not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: ["user@example.com"],
      subject: "Alert",
      html: "<p>Test</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Resend API key not configured");
  });

  it("surfaces API error message when request fails", async () => {
    const calls: Array<{ url: RequestInfo; init?: RequestInit }> = [];
    const mockResponse: Partial<Response> = {
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }) as unknown,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo, init?: RequestInit) => {
        calls.push({ url, init });
        return mockResponse as unknown as Response;
      }),
    );

    const result = await sendEmail({
      to: ["user@example.com"],
      subject: "Alert",
      html: "<p>Test</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(calls).toHaveLength(1);
  });
});

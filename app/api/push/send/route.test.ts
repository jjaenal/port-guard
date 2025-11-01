import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Definisikan tipe subscription untuk konsistensi
type Subscription = { id: string; address: string };

// Mock PrismaClient sebelum import route agar instance menggunakan mock
// Definisikan findMany di dalam factory dan ekspose via __mocks
vi.mock("@/lib/generated/prisma", () => {
  const findMany = vi.fn<() => Promise<Subscription[]>>();
  const PrismaClient = vi.fn(() => ({
    pushSubscription: {
      findMany,
    },
  }));
  return {
    PrismaClient,
    __mocks: { findMany },
  };
});

import * as route from "./route";

describe("/api/push/send route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export POST handler", () => {
    expect(route.POST).toBeDefined();
    expect(typeof route.POST).toBe("function");
  });

  it("returns 400 when title or message missing", async () => {
    const reqNoTitle = new NextRequest("http://localhost:3000/api/push/send", {
      method: "POST",
      body: JSON.stringify({ message: "Hello" }),
    });
    const res1 = await route.POST(reqNoTitle);
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.error).toContain("Title");

    const reqNoMessage = new NextRequest("http://localhost:3000/api/push/send", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
    });
    const res2 = await route.POST(reqNoMessage);
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.error).toContain("message");
  });

  it("returns 404 when no subscriptions found", async () => {
    const prismaModule = await import("@/lib/generated/prisma");
    const findMany = (prismaModule as unknown as { __mocks: { findMany: ReturnType<typeof vi.fn> } }).__mocks.findMany;
    findMany.mockResolvedValueOnce([]);
    const req = new NextRequest("http://localhost:3000/api/push/send", {
      method: "POST",
      body: JSON.stringify({ title: "T", message: "M", address: "0xabc" }),
    });
    const res = await route.POST(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Tidak ada subscription");
  });

  it("returns 200 and stats when subscriptions exist", async () => {
    const prismaModule = await import("@/lib/generated/prisma");
    const findMany = (prismaModule as unknown as { __mocks: { findMany: ReturnType<typeof vi.fn> } }).__mocks.findMany;
    findMany.mockResolvedValueOnce([
      { id: "1", address: "0x123" },
      { id: "2", address: "0x456" },
    ]);

    const req = new NextRequest("http://localhost:3000/api/push/send", {
      method: "POST",
      body: JSON.stringify({ title: "Hello", message: "World" }),
    });
    const res = await route.POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stats.total).toBe(2);
    // Simulasi semuanya dianggap sukses dalam implementasi saat ini
    expect(body.stats.successful).toBe(2);
    expect(body.stats.failed).toBe(0);
    expect(Array.isArray(body.results)).toBe(true);
  });

  it("returns 500 on internal error", async () => {
    const prismaModule = await import("@/lib/generated/prisma");
    const findMany = (prismaModule as unknown as { __mocks: { findMany: ReturnType<typeof vi.fn> } }).__mocks.findMany;
    findMany.mockRejectedValueOnce(new Error("DB error"));
    const req = new NextRequest("http://localhost:3000/api/push/send", {
      method: "POST",
      body: JSON.stringify({ title: "X", message: "Y" }),
    });
    const res = await route.POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Gagal mengirim");
  });
});
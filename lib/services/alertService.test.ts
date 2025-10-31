import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock coingecko price fetch to avoid network calls in tests
vi.mock("@/lib/api/coingecko", () => ({
  fetchTokenPrice: vi.fn(async () => 100),
}));

import { processAlerts, __setPrismaClientForTest } from "./alertService";
import type { PrismaClient } from "@/lib/generated/prisma";
import * as notificationService from "./notificationService";
import { fetchTokenPrice } from "@/lib/api/coingecko";

// Define explicit mocks to avoid TypeScript method type conflicts
const findManyMock = vi.fn();
const updateMock = vi.fn();
const findFirstSnapshotMock = vi.fn();
const createNotificationMock = vi.fn();

// Narrow interface to match only the methods we use, avoiding `any`
type MockFn = ReturnType<typeof vi.fn>;
interface PrismaAlertSubset {
  findMany: MockFn;
  update: MockFn;
}
interface PrismaPortfolioSnapshotSubset {
  findFirst: MockFn;
}
interface PrismaNotificationSubset {
  create: MockFn;
}
interface FakePrismaClient {
  alert: PrismaAlertSubset;
  portfolioSnapshot: PrismaPortfolioSnapshotSubset;
  notification: PrismaNotificationSubset;
}

const fakeClient: FakePrismaClient = {
  alert: {
    findMany: findManyMock,
    update: updateMock,
  },
  portfolioSnapshot: {
    findFirst: findFirstSnapshotMock,
  },
  notification: {
    create: createNotificationMock,
  },
};

describe("alertService - portfolio alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks
    findManyMock.mockResolvedValue([]);
    updateMock.mockResolvedValue({} as never);
    findFirstSnapshotMock.mockResolvedValue(null);
    createNotificationMock.mockResolvedValue({} as never);

    // Mock notification service
    vi.spyOn(notificationService, "sendEmail").mockResolvedValue({
      success: true,
      id: "email_123",
    });

    describe("processAlerts - notification integration", () => {
      it("sends email notification when price alert is triggered", async () => {
        // Mock price fetch to return 150 (above threshold of 100)
        vi.mocked(fetchTokenPrice).mockResolvedValue(150);

        // Mock alert that should trigger
        const mockAlert = {
          id: "alert_price_above",
          type: "price",
          tokenSymbol: "ETH",
          operator: "above",
          value: 100,
          enabled: true,
          address: null,
          lastTriggered: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        findManyMock.mockResolvedValue([mockAlert]);

        await processAlerts();

        // Verify email was sent
        expect(notificationService.sendEmail).toHaveBeenCalledWith({
          to: ["admin@portguard.app"],
          subject: "Price Alert: ETH above $100",
          html: "<html>test</html>",
        });

        expect(notificationService.buildAlertEmailHtml).toHaveBeenCalledWith(
          "Price Alert: ETH above $100",
          expect.stringContaining("Current price: $150.00"),
        );
      });

      it("sends email notification when portfolio alert is triggered", async () => {
        // Mock portfolio snapshot with value above threshold
        const mockSnapshot = {
          id: "snapshot_1",
          address: "0x123",
          totalValue: 5500,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        findFirstSnapshotMock.mockResolvedValue(mockSnapshot);

        // Mock portfolio alert that should trigger
        const mockAlert = {
          id: "alert_portfolio_above",
          type: "portfolio",
          tokenSymbol: null,
          operator: "above",
          value: 5000,
          enabled: true,
          address: "0x123",
          lastTriggered: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        findManyMock.mockResolvedValue([mockAlert]);

        await processAlerts();

        // Verify email was sent
        expect(notificationService.sendEmail).toHaveBeenCalledWith({
          to: ["admin@portguard.app"],
          subject: "Portfolio Alert: crossed above $5000",
          html: "<html>test</html>",
        });

        expect(notificationService.buildAlertEmailHtml).toHaveBeenCalledWith(
          "Portfolio Alert: above $5000",
          expect.stringContaining("Current portfolio value: $5500.00"),
        );

        // Verify notification was created
        expect(createNotificationMock).toHaveBeenCalledWith({
          data: {
            alertId: "alert_portfolio_above",
            address: "0x123",
            title: "Portfolio Value Alert",
            message: "Portfolio value crossed above $5000 (current $5500.00)",
            type: "portfolio",
            isRead: false,
            triggeredAt: expect.any(Date),
          },
        });
      });

      it("handles notification failure gracefully", async () => {
        // Mock notification service to fail
        vi.mocked(notificationService.sendEmail).mockResolvedValue({
          success: false,
          error: "API key not configured",
        });

        // Mock price fetch and alert
        vi.mocked(fetchTokenPrice).mockResolvedValue(150);
        const mockAlert = {
          id: "alert_price_above",
          type: "price",
          tokenSymbol: "ETH",
          operator: "above",
          value: 100,
          enabled: true,
          address: null,
          lastTriggered: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        findManyMock.mockResolvedValue([mockAlert]);

        // Should not throw error even if notification fails
        await expect(processAlerts()).resolves.not.toThrow();

        // Alert should still be updated
        expect(updateMock).toHaveBeenCalledWith({
          where: { id: "alert_price_above" },
          data: { lastTriggered: expect.any(Date) },
        });
      });
    });
    vi.spyOn(notificationService, "buildAlertEmailHtml").mockReturnValue(
      "<html>test</html>",
    );

    // Inject fake client before each test
    __setPrismaClientForTest(
      fakeClient as unknown as import("@/lib/generated/prisma").PrismaClient,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers 'above' portfolio alert when totalValue is greater than threshold", async () => {
    const now = new Date().toISOString();
    findManyMock.mockResolvedValueOnce([
      {
        id: "a1",
        address: "0xabc",
        type: "portfolio",
        tokenAddress: null,
        tokenSymbol: null,
        chain: null,
        operator: "above",
        value: 1000,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s1",
      address: "0xabc",
      totalValue: 5000,
      createdAt: new Date().toISOString(),
    });

    updateMock.mockResolvedValueOnce({ id: "a1", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.where).toEqual({ id: "a1" });
    expect(args.data.lastTriggered).toBeInstanceOf(Date);
  });

  it("does not trigger 'above' portfolio alert when totalValue is lower than threshold", async () => {
    const now = new Date().toISOString();
    findManyMock.mockResolvedValueOnce([
      {
        id: "a2",
        address: "0xabc",
        type: "portfolio",
        tokenAddress: null,
        tokenSymbol: null,
        chain: null,
        operator: "above",
        value: 10000,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s2",
      address: "0xabc",
      totalValue: 5000,
      createdAt: new Date().toISOString(),
    });

    await processAlerts();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("triggers 'below' portfolio alert when totalValue is lower than threshold", async () => {
    const now = new Date().toISOString();
    findManyMock.mockResolvedValueOnce([
      {
        id: "a3",
        address: "0xdef",
        type: "portfolio",
        tokenAddress: null,
        tokenSymbol: null,
        chain: null,
        operator: "below",
        value: 10000,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s3",
      address: "0xdef",
      totalValue: 5000,
      createdAt: new Date().toISOString(),
    });

    updateMock.mockResolvedValueOnce({ id: "a3", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.where).toEqual({ id: "a3" });
    expect(args.data.lastTriggered).toBeInstanceOf(Date);
  });

  it("skips portfolio alert within cooldown window", async () => {
    const now = new Date();
    const prev = new Date(now.getTime() - 60 * 1000);

    findManyMock.mockResolvedValueOnce([
      {
        id: "c1",
        address: "0xabc",
        type: "portfolio",
        tokenAddress: null,
        tokenSymbol: null,
        chain: null,
        operator: "above",
        value: 5000,
        enabled: true,
        createdAt: now.toISOString(),
        lastTriggered: new Date(), // Cooldown aktif
      },
    ]);

    // Latest snapshot: 5500 (di atas)
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "sc_latest",
      address: "0xabc",
      totalValue: 5500,
      createdAt: now.toISOString(),
    });
    // Previous snapshot: 4500 (crossing dari bawah)
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "sc_prev",
      address: "0xabc",
      totalValue: 4500,
      createdAt: prev.toISOString(),
    });

    await processAlerts();

    // Karena cooldown aktif, tidak update dan tidak buat notifikasi
    expect(updateMock).not.toHaveBeenCalled();
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("skips price alert within cooldown window", async () => {
    const now = new Date().toISOString();

    vi.mocked(fetchTokenPrice).mockResolvedValue(200);

    findManyMock.mockResolvedValueOnce([
      {
        id: "c2",
        address: "0xabc",
        type: "price",
        tokenAddress: null,
        tokenSymbol: "ETH",
        chain: "ethereum",
        operator: "above",
        value: 150,
        enabled: true,
        createdAt: now,
        lastTriggered: new Date(), // Cooldown aktif
      },
    ]);

    await processAlerts();

    expect(updateMock).not.toHaveBeenCalled();
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("does not retrigger when still above threshold (requires crossing)", async () => {
    const now = new Date();
    const prev = new Date(now.getTime() - 60 * 1000);

    // Alert 'above' 5000
    findManyMock.mockResolvedValueOnce([
      {
        id: "a4",
        address: "0xabc",
        type: "portfolio",
        tokenAddress: null,
        tokenSymbol: null,
        chain: null,
        operator: "above",
        value: 5000,
        enabled: true,
        createdAt: now.toISOString(),
        lastTriggered: null,
      },
    ]);

    // Latest snapshot: 6500
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s_latest",
      address: "0xabc",
      totalValue: 6500,
      createdAt: now.toISOString(),
    });
    // Previous snapshot: 6000 (still above)
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s_prev",
      address: "0xabc",
      totalValue: 6000,
      createdAt: prev.toISOString(),
    });

    await processAlerts();

    // Tidak ada crossing (tetap di atas), seharusnya tidak trigger
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("triggers only when crossing from below to above", async () => {
    const now = new Date();
    const prev = new Date(now.getTime() - 60 * 1000);

    findManyMock.mockResolvedValueOnce([
      {
        id: "a5",
        address: "0xabc",
        type: "portfolio",
        tokenAddress: null,
        tokenSymbol: null,
        chain: null,
        operator: "above",
        value: 5000,
        enabled: true,
        createdAt: now.toISOString(),
        lastTriggered: null,
      },
    ]);

    // Latest snapshot: 5500
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s_latest2",
      address: "0xabc",
      totalValue: 5500,
      createdAt: now.toISOString(),
    });
    // Previous snapshot: 4500 (di bawah)
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s_prev2",
      address: "0xabc",
      totalValue: 4500,
      createdAt: prev.toISOString(),
    });

    updateMock.mockResolvedValueOnce({ id: "a5", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("triggers only when crossing from above to below", async () => {
    const now = new Date();
    const prev = new Date(now.getTime() - 60 * 1000);

    findManyMock.mockResolvedValueOnce([
      {
        id: "a6",
        address: "0xabc",
        type: "portfolio",
        tokenAddress: null,
        tokenSymbol: null,
        chain: null,
        operator: "below",
        value: 5000,
        enabled: true,
        createdAt: now.toISOString(),
        lastTriggered: null,
      },
    ]);

    // Latest snapshot: 4500 (di bawah)
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s_latest3",
      address: "0xabc",
      totalValue: 4500,
      createdAt: now.toISOString(),
    });
    // Previous snapshot: 5500 (di atas)
    findFirstSnapshotMock.mockResolvedValueOnce({
      id: "s_prev3",
      address: "0xabc",
      totalValue: 5500,
      createdAt: prev.toISOString(),
    });

    updateMock.mockResolvedValueOnce({ id: "a6", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});

describe("alertService - metrics functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setPrismaClientForTest(fakeClient as unknown as PrismaClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return correct metrics when no alerts exist", async () => {
    // Mock no active alerts
    findManyMock.mockResolvedValue([]);

    const metrics = await processAlerts();

    expect(metrics).toEqual({
      alertsEvaluated: 0,
      alertsTriggered: 0,
    });
  });

  it("should count evaluated alerts correctly", async () => {
    const mockAlerts = [
      {
        id: "1",
        userId: "user1",
        type: "price_above",
        tokenAddress: "0x123",
        tokenSymbol: "ETH",
        targetPrice: 2000,
        isActive: true,
        lastTriggered: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        userId: "user1",
        type: "price_below",
        tokenAddress: "0x456",
        tokenSymbol: "BTC",
        targetPrice: 30000,
        isActive: true,
        lastTriggered: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    findManyMock.mockResolvedValue(mockAlerts);
    vi.mocked(fetchTokenPrice).mockResolvedValue(1800); // ETH below target

    const metrics = await processAlerts();

    expect(metrics.alertsEvaluated).toBe(2);
    expect(metrics.alertsTriggered).toBe(0); // Neither condition met
  });

  it("should count triggered alerts correctly", async () => {
    const mockAlerts = [
      {
        id: "1",
        userId: "user1",
        type: "price",
        tokenSymbol: "ETH",
        operator: "above",
        value: 2000,
        enabled: true,
        address: null,
        lastTriggered: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    findManyMock.mockResolvedValue(mockAlerts);
    vi.mocked(fetchTokenPrice).mockResolvedValue(2500); // ETH above target
    createNotificationMock.mockResolvedValue({ id: "notif1" });
    updateMock.mockResolvedValue({});

    // Tidak perlu spy ke fungsi email; kita fokus pada metrics

    const metrics = await processAlerts();

    expect(metrics.alertsEvaluated).toBe(1);
    expect(metrics.alertsTriggered).toBe(1); // Condition met
  });

  it("should handle portfolio alerts in metrics", async () => {
    const mockAlerts = [
      {
        id: "1",
        userId: "user1",
        type: "portfolio",
        address: "0xwallet",
        operator: "above",
        value: 10000,
        enabled: true,
        lastTriggered: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    findManyMock.mockResolvedValue(mockAlerts);
    // Panggilan pertama (snapshot terbaru)
    findFirstSnapshotMock.mockResolvedValueOnce({
      totalValue: 15000, // Di atas target
      createdAt: new Date(),
    });
    // Panggilan kedua (snapshot sebelumnya)
    findFirstSnapshotMock.mockResolvedValueOnce(null);
    createNotificationMock.mockResolvedValue({ id: "notif1" });
    updateMock.mockResolvedValue({});

    // Tidak perlu spy ke fungsi email; kita fokus pada metrics

    const metrics = await processAlerts();

    expect(metrics.alertsEvaluated).toBe(1);
    expect(metrics.alertsTriggered).toBe(1);
  });

  it("should not count alerts within cooldown period", async () => {
    const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    const mockAlerts = [
      {
        id: "1",
        userId: "user1",
        type: "price_above",
        tokenAddress: "0x123",
        tokenSymbol: "ETH",
        targetPrice: 2000,
        isActive: true,
        lastTriggered: recentTime, // Recently triggered
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    findManyMock.mockResolvedValue(mockAlerts);
    vi.mocked(fetchTokenPrice).mockResolvedValue(2500); // Above target but in cooldown

    const metrics = await processAlerts();

    expect(metrics.alertsEvaluated).toBe(1);
    expect(metrics.alertsTriggered).toBe(0); // Should not trigger due to cooldown
  });

  it("should handle mixed alert types correctly", async () => {
    const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    const mockAlerts = [
      {
        id: "1",
        userId: "user1",
        type: "price",
        tokenSymbol: "ETH",
        operator: "above",
        value: 2000,
        enabled: true,
        address: null,
        lastTriggered: oldTime, // Outside cooldown
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        userId: "user1",
        type: "portfolio",
        address: "0xwallet",
        operator: "below",
        value: 5000,
        enabled: true,
        lastTriggered: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    findManyMock.mockResolvedValue(mockAlerts);
    vi.mocked(fetchTokenPrice).mockResolvedValue(2500); // ETH above target
    findFirstSnapshotMock
      .mockResolvedValueOnce({
        totalValue: 3000, // Current value below target
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        totalValue: 6000, // Previous value above target to ensure crossing
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      });
    createNotificationMock.mockResolvedValue({ id: "notif1" });
    updateMock.mockResolvedValue({});

    // Tidak perlu spy ke fungsi email; kita fokus pada metrics

    const metrics = await processAlerts();

    expect(metrics.alertsEvaluated).toBe(2);
    expect(metrics.alertsTriggered).toBe(2); // Both should trigger
  });

  it("should handle errors gracefully and return zero metrics", async () => {
    findManyMock.mockRejectedValue(new Error("Database error"));

    const metrics = await processAlerts();

    // Should return zero metrics when processing fails
    expect(metrics.alertsEvaluated).toBe(0);
    expect(metrics.alertsTriggered).toBe(0);
  });
});

describe("alertService - price alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setPrismaClientForTest(
      fakeClient as unknown as import("@/lib/generated/prisma").PrismaClient,
    );

    // Ensure notification create mock resolves
    createNotificationMock.mockResolvedValue({} as never);
  });

  it("triggers 'above' price alert when price is greater than threshold", async () => {
    const now = new Date().toISOString();

    // Price mocked at 100 in coingecko mock
    findManyMock.mockResolvedValueOnce([
      {
        id: "p1",
        address: "0xabc",
        type: "price",
        tokenAddress: null,
        tokenSymbol: "ETH",
        chain: "ethereum",
        operator: "above",
        value: 50,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    updateMock.mockResolvedValueOnce({ id: "p1", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.where).toEqual({ id: "p1" });
    expect(args.data.lastTriggered).toBeInstanceOf(Date);

    // Verify notification was created for price alert
    expect(createNotificationMock).toHaveBeenCalledWith({
      data: {
        alertId: "p1",
        address: "0xabc",
        title: "ETH Price Alert",
        message: "ETH is now $100.00 (above $50)",
        type: "price",
        isRead: false,
        triggeredAt: expect.any(Date),
      },
    });
  });

  it("does not trigger 'above' price alert when price is lower than threshold", async () => {
    const now = new Date().toISOString();

    findManyMock.mockResolvedValueOnce([
      {
        id: "p2",
        address: "0xabc",
        type: "price",
        tokenAddress: null,
        tokenSymbol: "ETH",
        chain: "ethereum",
        operator: "above",
        value: 150,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    await processAlerts();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("triggers 'below' price alert when price is lower than threshold", async () => {
    const now = new Date().toISOString();

    findManyMock.mockResolvedValueOnce([
      {
        id: "p3",
        address: "0xabc",
        type: "price",
        tokenAddress: null,
        tokenSymbol: "ETH",
        chain: "ethereum",
        operator: "below",
        value: 150,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    updateMock.mockResolvedValueOnce({ id: "p3", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.where).toEqual({ id: "p3" });
    expect(args.data.lastTriggered).toBeInstanceOf(Date);
  });

  it("triggers 'percent_increase' price alert (simplified logic)", async () => {
    const now = new Date().toISOString();

    // Price mocked at 100, simplified percent_increase logic in service should trigger
    findManyMock.mockResolvedValueOnce([
      {
        id: "p4",
        address: "0xabc",
        type: "price",
        tokenAddress: null,
        tokenSymbol: "ETH",
        chain: "ethereum",
        operator: "percent_increase",
        value: 10,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    updateMock.mockResolvedValueOnce({ id: "p4", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.where).toEqual({ id: "p4" });
    expect(args.data.lastTriggered).toBeInstanceOf(Date);
  });

  it("triggers 'percent_decrease' price alert (simplified logic)", async () => {
    const now = new Date().toISOString();

    // Price mocked at 100, simplified percent_decrease logic in service should trigger
    findManyMock.mockResolvedValueOnce([
      {
        id: "p5",
        address: "0xabc",
        type: "price",
        tokenAddress: null,
        tokenSymbol: "ETH",
        chain: "ethereum",
        operator: "percent_decrease",
        value: 10,
        enabled: true,
        createdAt: now,
        lastTriggered: null,
      },
    ]);

    updateMock.mockResolvedValueOnce({ id: "p5", lastTriggered: new Date() });

    await processAlerts();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.where).toEqual({ id: "p5" });
    expect(args.data.lastTriggered).toBeInstanceOf(Date);
  });
});

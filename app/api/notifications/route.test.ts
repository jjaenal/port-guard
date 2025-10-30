import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma with hoist-safe pattern
// (Removed unused local mockPrisma declaration)

vi.mock("@/lib/generated/prisma", () => {
  const localMockPrisma = {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => localMockPrisma),
    __mockPrisma: localMockPrisma,
  };
});

// Mock rate limiting
vi.mock("@/lib/utils/rate-limit", () => ({
  getClientKey: vi.fn(() => "test-key"),
  rateLimit: vi.fn(() =>
    Promise.resolve({ allowed: true, resetAt: Date.now() }),
  ),
}));

// Import route handlers AFTER mocks are set up
import * as generatedPrisma from "@/lib/generated/prisma";
type PrismaNotificationMock = {
  findMany: Mock;
  count: Mock;
  updateMany: Mock;
  deleteMany: Mock;
};
type GeneratedPrismaWithMock = {
  __mockPrisma: {
    notification: PrismaNotificationMock;
  };
};
const __mockPrisma = (generatedPrisma as unknown as GeneratedPrismaWithMock)
  .__mockPrisma;
import { GET, PATCH, DELETE } from "./route";

describe("/api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should fetch notifications for valid address", async () => {
      const mockNotifications = [
        {
          id: "notif1",
          alertId: "alert1",
          address: "0x1234567890123456789012345678901234567890",
          title: "ETH Price Alert",
          message: "ETH price is above $2000",
          type: "price",
          isRead: false,
          triggeredAt: new Date(),
          readAt: null,
          alert: {
            type: "price",
            tokenSymbol: "ETH",
            operator: "above",
            value: 2000,
          },
        },
      ];

      __mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      __mockPrisma.notification.count.mockResolvedValue(1);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?address=0x1234567890123456789012345678901234567890",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toEqual([
        {
          id: "notif1",
          alertId: "alert1",
          address: "0x1234567890123456789012345678901234567890",
          title: "ETH Price Alert",
          message: "ETH price is above $2000",
          type: "price",
          isRead: false,
          triggeredAt: expect.any(String),
          readAt: null,
          alert: {
            type: "price",
            tokenSymbol: "ETH",
            operator: "above",
            value: 2000,
          },
        },
      ]);
      expect(data.pagination.total).toBe(1);
      expect(__mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          address: "0x1234567890123456789012345678901234567890",
        },
        include: {
          alert: {
            select: {
              type: true,
              tokenSymbol: true,
              operator: true,
              value: true,
            },
          },
        },
        orderBy: {
          triggeredAt: "desc",
        },
        take: 50,
        skip: 0,
      });
    });

    it("should filter by read status", async () => {
      __mockPrisma.notification.findMany.mockResolvedValue([]);
      __mockPrisma.notification.count.mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?address=0x1234567890123456789012345678901234567890&isRead=true",
      );

      await GET(request);

      expect(__mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            address: "0x1234567890123456789012345678901234567890",
            isRead: true,
          },
        }),
      );
    });

    it("should filter by type", async () => {
      __mockPrisma.notification.findMany.mockResolvedValue([]);
      __mockPrisma.notification.count.mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?address=0x1234567890123456789012345678901234567890&type=price",
      );

      await GET(request);

      expect(__mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            address: "0x1234567890123456789012345678901234567890",
            type: "price",
          },
        }),
      );
    });

    it("should handle pagination", async () => {
      __mockPrisma.notification.findMany.mockResolvedValue([]);
      __mockPrisma.notification.count.mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?address=0x1234567890123456789012345678901234567890&limit=10&offset=20",
      );

      await GET(request);

      expect(__mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("should return 400 for missing address", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Address parameter is required");
    });

    it("should return 400 for invalid address", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?address=invalid",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid Ethereum address");
    });
  });

  describe("PATCH", () => {
    it("should mark notifications as read", async () => {
      const notificationIds = ["notif1", "notif2"];
      const address = "0x1234567890123456789012345678901234567890";

      __mockPrisma.notification.findMany.mockResolvedValue([
        { id: "notif1" },
        { id: "notif2" },
      ]);
      __mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "PATCH",
          body: JSON.stringify({
            notificationIds,
            isRead: true,
            address,
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.updated).toBe(2);
      expect(__mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: notificationIds },
          address: address.toLowerCase(),
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it("should mark notifications as unread", async () => {
      const notificationIds = ["notif1"];
      const address = "0x1234567890123456789012345678901234567890";

      __mockPrisma.notification.findMany.mockResolvedValue([{ id: "notif1" }]);
      __mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "PATCH",
          body: JSON.stringify({
            notificationIds,
            isRead: false,
            address,
          }),
        },
      );

      await PATCH(request);

      expect(__mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: notificationIds },
          address: address.toLowerCase(),
        },
        data: {
          isRead: false,
          readAt: null,
        },
      });
    });

    it("should return 400 for invalid address", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "PATCH",
          body: JSON.stringify({
            notificationIds: ["notif1"],
            isRead: true,
            address: "invalid",
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid address is required");
    });

    it("should return 404 for unauthorized notifications", async () => {
      __mockPrisma.notification.findMany.mockResolvedValue([]); // No notifications found

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "PATCH",
          body: JSON.stringify({
            notificationIds: ["notif1"],
            isRead: true,
            address: "0x1234567890123456789012345678901234567890",
          }),
        },
      );

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Some notifications not found or unauthorized");
    });
  });

  describe("DELETE", () => {
    it("should delete notifications", async () => {
      const notificationIds = ["notif1", "notif2"];
      const address = "0x1234567890123456789012345678901234567890";

      __mockPrisma.notification.findMany.mockResolvedValue([
        { id: "notif1" },
        { id: "notif2" },
      ]);
      __mockPrisma.notification.deleteMany.mockResolvedValue({ count: 2 });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "DELETE",
          body: JSON.stringify({
            notificationIds,
            address,
          }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBe(2);
      expect(__mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: notificationIds },
          address: address.toLowerCase(),
        },
      });
    });

    it("should return 400 for invalid address", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "DELETE",
          body: JSON.stringify({
            notificationIds: ["notif1"],
            address: "invalid",
          }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Valid address is required");
    });

    it("should return 404 for unauthorized notifications", async () => {
      __mockPrisma.notification.findMany.mockResolvedValue([]); // No notifications found

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "DELETE",
          body: JSON.stringify({
            notificationIds: ["notif1"],
            address: "0x1234567890123456789012345678901234567890",
          }),
        },
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Some notifications not found or unauthorized");
    });
  });
});

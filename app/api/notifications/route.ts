import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
import { getClientKey, rateLimit } from "@/lib/utils/rate-limit";
import { isAddress } from "viem";

const prisma = new PrismaClient();

/**
 * GET /api/notifications
 * Fetch notifications for a wallet address
 * Query params:
 * - address: wallet address (required)
 * - isRead: filter by read status (optional)
 * - limit: number of notifications to return (default: 50)
 * - offset: pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rlKey = getClientKey(request, "notifications");
    const { allowed, resetAt } = await rateLimit(rlKey, 20, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt),
          },
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const isReadParam = searchParams.get("isRead");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 },
      );
    }

    if (!isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 },
      );
    }

    // Parse optional parameters
    const isRead =
      isReadParam === "true"
        ? true
        : isReadParam === "false"
          ? false
          : undefined;
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    // Build where clause with precise Prisma type
    const where: NonNullable<
      Parameters<typeof prisma.notification.findMany>[0]
    >["where"] = {
      address: address.toLowerCase(),
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    // Fetch notifications with alert details
    const notifications = await prisma.notification.findMany({
      where,
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
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.notification.count({ where });

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);

    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read/unread
 * Body:
 * - notificationIds: array of notification IDs
 * - isRead: boolean (true = mark as read, false = mark as unread)
 * - address: wallet address for authorization
 */
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const rlKey = getClientKey(request, "notifications-patch");
    const { allowed, resetAt } = await rateLimit(rlKey, 10, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt),
          },
        },
      );
    }

    const body = await request.json();
    const { notificationIds, isRead, address } = body;

    // Validate required parameters
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "Valid address is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "notificationIds array is required" },
        { status: 400 },
      );
    }

    if (typeof isRead !== "boolean") {
      return NextResponse.json(
        { error: "isRead boolean is required" },
        { status: 400 },
      );
    }

    // Verify all notifications belong to the address
    const existingNotifications = await prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
        address: address.toLowerCase(),
      },
      select: { id: true },
    });

    if (existingNotifications.length !== notificationIds.length) {
      return NextResponse.json(
        { error: "Some notifications not found or unauthorized" },
        { status: 404 },
      );
    }

    // Update notifications payload with precise Prisma type
    const updateData: NonNullable<
      Parameters<typeof prisma.notification.updateMany>[0]
    >["data"] = {
      isRead,
    };

    if (isRead) {
      updateData.readAt = new Date();
    } else {
      updateData.readAt = null;
    }

    const updatedNotifications = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        address: address.toLowerCase(),
      },
      data: updateData,
    });

    return NextResponse.json({
      message: `${updatedNotifications.count} notifications updated`,
      updated: updatedNotifications.count,
    });
  } catch (error) {
    console.error("Error updating notifications:", error);

    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notification(s)
 * Body:
 * - notificationIds: array of notification IDs
 * - address: wallet address for authorization
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rlKey = getClientKey(request, "notifications-delete");
    const { allowed, resetAt } = await rateLimit(rlKey, 5, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt),
          },
        },
      );
    }

    const body = await request.json();
    const { notificationIds, address } = body;

    // Validate required parameters
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "Valid address is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "notificationIds array is required" },
        { status: 400 },
      );
    }

    // Verify all notifications belong to the address
    const existingNotifications = await prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
        address: address.toLowerCase(),
      },
      select: { id: true },
    });

    if (existingNotifications.length !== notificationIds.length) {
      return NextResponse.json(
        { error: "Some notifications not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete notifications
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        address: address.toLowerCase(),
      },
    });

    return NextResponse.json({
      message: `${deletedNotifications.count} notifications deleted`,
      deleted: deletedNotifications.count,
    });
  } catch (error) {
    console.error("Error deleting notifications:", error);

    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 },
    );
  }
}

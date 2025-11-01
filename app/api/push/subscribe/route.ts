import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

/**
 * API endpoint untuk mengelola push notification subscriptions
 * POST /api/push/subscribe - Subscribe ke push notifications
 * DELETE /api/push/subscribe - Unsubscribe dari push notifications
 */

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

interface SubscriptionPayload {
  address: string;
  subscription: PushSubscriptionData;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscriptionPayload;
    const { address, subscription } = body;

    if (!address || !subscription) {
      return NextResponse.json(
        { error: "Address dan subscription diperlukan" },
        { status: 400 },
      );
    }

    // Validasi format address (basic)
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: "Format address tidak valid" },
        { status: 400 },
      );
    }

    // Validasi subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Format subscription tidak valid" },
        { status: 400 },
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Upsert subscription - update jika sudah ada, create jika belum
    const result = await prisma.pushSubscription.upsert({
      where: {
        address: normalizedAddress,
      },
      update: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updatedAt: new Date(),
      },
      create: {
        address: normalizedAddress,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription berhasil disimpan",
      id: result.id,
    });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan subscription" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address diperlukan" },
        { status: 400 },
      );
    }

    // Validasi format address
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: "Format address tidak valid" },
        { status: 400 },
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Hapus subscription
    const result = await prisma.pushSubscription.deleteMany({
      where: {
        address: normalizedAddress,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} subscription dihapus`,
      deleted: result.count,
    });
  } catch (error) {
    console.error("Error deleting push subscription:", error);
    return NextResponse.json(
      { error: "Gagal menghapus subscription" },
      { status: 500 },
    );
  }
}
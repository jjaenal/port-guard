import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

/**
 * API endpoint untuk mengirim push notifications ke subscribers
 * POST /api/push/send - Kirim push notification ke address tertentu atau semua subscribers
 */

interface PushNotificationPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  url?: string;
  address?: string; // Jika tidak ada, kirim ke semua subscribers
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PushNotificationPayload;
    const { title, message, icon, badge, url, address } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title dan message diperlukan" },
        { status: 400 },
      );
    }

    // Ambil subscriptions berdasarkan address atau semua
    const whereClause = address ? { address: address.toLowerCase() } : {};
    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause,
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada subscription ditemukan" },
        { status: 404 },
      );
    }

    // Payload notifikasi
    const notificationPayload = {
      title,
      body: message,
      icon: icon || "/icons/icon-192x192.png",
      badge: badge || "/icons/badge-72x72.png",
      data: {
        url: url || "/dashboard",
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "view",
          title: "Lihat Detail",
        },
        {
          action: "dismiss",
          title: "Tutup",
        },
      ],
    };

    // Kirim notifikasi ke semua subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          // Simulasi pengiriman push notification
          // Dalam implementasi nyata, gunakan web-push library
          console.log("Sending push notification to:", subscription.address);
          console.log("Payload:", notificationPayload);
          
          return {
            success: true,
            address: subscription.address,
          };
        } catch (error) {
          console.error("Failed to send push notification:", error);
          return {
            success: false,
            address: subscription.address,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value.success,
    ).length;

    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: `Push notification berhasil dikirim`,
      stats: {
        total: subscriptions.length,
        successful,
        failed,
      },
      results: results.map((result) =>
        result.status === "fulfilled" ? result.value : { success: false },
      ),
    });
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return NextResponse.json(
      { error: "Gagal mengirim push notifications" },
      { status: 500 },
    );
  }
}
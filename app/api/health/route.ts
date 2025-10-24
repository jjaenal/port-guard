import { NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  const now = new Date().toISOString();
  let dbStatus: "ok" | "error" = "ok";
  let dbLatencyMs: number | null = null;

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch (e) {
    dbStatus = "error";
  }

  return NextResponse.json({
    status: "ok",
    time: now,
    db: { status: dbStatus, latency_ms: dbLatencyMs },
  });
}

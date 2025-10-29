import { NextRequest } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
import { getClientKey, rateLimit } from "@/lib/utils/rate-limit";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return Response.json({ error: "Address is required" }, { status: 400 });
    }

    // Rate limiting
    const rlKey = getClientKey(req, "alerts");
    const { allowed, resetAt } = await rateLimit(rlKey, 20, 60);
    if (!allowed) {
      return Response.json(
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

    const alerts = await prisma.alert.findMany({
      where: {
        address: address.toLowerCase(),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(
      { alerts },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return Response.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return Response.json({ error: "Address is required" }, { status: 400 });
    }

    // Rate limiting
    const rlKey = getClientKey(req, "alerts");
    const { allowed, resetAt } = await rateLimit(rlKey, 10, 60);
    if (!allowed) {
      return Response.json(
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

    const body = await req.json();
    const { type, tokenAddress, tokenSymbol, chain, operator, value } = body;

    if (!type || !operator || !value) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const alert = await prisma.alert.create({
      data: {
        address: address.toLowerCase(),
        type,
        tokenAddress,
        tokenSymbol,
        chain,
        operator,
        value: parseFloat(value),
        enabled: true,
      },
    });

    return Response.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Error creating alert:", error);
    return Response.json({ error: "Failed to create alert" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const id = searchParams.get("id");

    if (!address || !id) {
      return Response.json(
        { error: "Address and alert ID are required" },
        { status: 400 },
      );
    }

    // Rate limiting
    const rlKey = getClientKey(req, "alerts");
    const { allowed, resetAt } = await rateLimit(rlKey, 15, 60);
    if (!allowed) {
      return Response.json(
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

    const body = await req.json();
    const { enabled } = body;

    if (enabled === undefined) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify alert belongs to the address
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id,
        address: address.toLowerCase(),
      },
    });

    if (!existingAlert) {
      return Response.json(
        { error: "Alert not found or not authorized" },
        { status: 404 },
      );
    }

    const alert = await prisma.alert.update({
      where: {
        id,
      },
      data: {
        enabled,
      },
    });

    return Response.json({ alert }, { status: 200 });
  } catch (error) {
    console.error("Error updating alert:", error);
    return Response.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const id = searchParams.get("id");

    if (!address || !id) {
      return Response.json(
        { error: "Address and alert ID are required" },
        { status: 400 },
      );
    }

    // Rate limiting
    const rlKey = getClientKey(req, "alerts");
    const { allowed, resetAt } = await rateLimit(rlKey, 10, 60);
    if (!allowed) {
      return Response.json(
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

    // Verify alert belongs to the address
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id,
        address: address.toLowerCase(),
      },
    });

    if (!existingAlert) {
      return Response.json(
        { error: "Alert not found or not authorized" },
        { status: 404 },
      );
    }

    await prisma.alert.delete({
      where: {
        id,
      },
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return Response.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}

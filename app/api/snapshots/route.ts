import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

// GET /api/snapshots?address=0x...&limit=5
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(50, Number(limitParam))) : 1;
    const offsetParam = searchParams.get("offset");
    const offset = offsetParam ? Math.max(0, Number(offsetParam)) : 0;

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 },
      );
    }

    if (limit > 1) {
      // Return a list of recent snapshots for the address
      const snapshots = await prisma.portfolioSnapshot.findMany({
        where: { address: address.toLowerCase() },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          address: true,
          totalValue: true,
          createdAt: true,
          tokenCount: true,
        },
      });

      return NextResponse.json({ data: snapshots });
    }

    // Get latest snapshot for the address
    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: { address: address.toLowerCase() },
      include: { tokens: true },
      orderBy: { createdAt: "desc" },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: "No snapshot found for this address" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: snapshot.id,
      address: snapshot.address,
      totalValue: snapshot.totalValue,
      createdAt: snapshot.createdAt,
      tokens: snapshot.tokens.map((token) => ({
        chain: token.chain,
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        price: token.price,
        value: token.value,
      })),
    });
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface TokenInput {
  chain?: "ethereum" | "polygon";
  address?: string;
  symbol?: string;
  name?: string;
  balance?: string;
  decimals?: number;
  price?: number;
  value?: number;
  change24h?: number;
}

// POST /api/snapshots
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, tokens } = body;

    if (!address || !Array.isArray(tokens)) {
      return NextResponse.json(
        { error: "Address and tokens array are required" },
        { status: 400 },
      );
    }

    // Calculate total portfolio value
    const totalValue = (tokens as TokenInput[]).reduce(
      (sum: number, token: TokenInput) => sum + (token.value || 0),
      0,
    );

    // Calculate additional fields for schema compatibility
    const ethBalance =
      (tokens as TokenInput[]).find((t: TokenInput) => t.symbol === "ETH")
        ?.value || 0;
    const maticBalance =
      (tokens as TokenInput[]).find((t: TokenInput) => t.symbol === "MATIC")
        ?.value || 0;
    const tokenCount = tokens.length;

    // Create new snapshot with tokens
    const snapshot = await prisma.portfolioSnapshot.create({
      data: {
        address: address.toLowerCase(),
        totalValue,
        ethBalance,
        maticBalance,
        tokenCount,
        tokens: {
          create: (tokens as TokenInput[]).map((token: TokenInput) => ({
            chain:
              token.chain ||
              (token.symbol === "ETH"
                ? "ethereum"
                : token.symbol === "MATIC"
                  ? "polygon"
                  : "ethereum"),
            address: token.address || "",
            symbol: token.symbol || "",
            name: token.name || "",
            balance: token.balance || "0",
            decimals: token.decimals || 18,
            price: token.price || 0,
            value: token.value || 0,
            change24h: token.change24h || null,
          })),
        },
      },
      include: { tokens: true },
    });

    return NextResponse.json({
      id: snapshot.id,
      address: snapshot.address,
      totalValue: snapshot.totalValue,
      createdAt: snapshot.createdAt,
      tokenCount: snapshot.tokens.length,
    });
  } catch (error) {
    console.error("Error creating snapshot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

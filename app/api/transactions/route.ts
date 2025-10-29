import { NextResponse } from "next/server";
import {
  validateEthereumAddress,
  AppError,
  ErrorCodes,
  handleUnknownError,
} from "@/lib/utils/api-errors";
import {
  rateLimit,
  getClientKey,
  tooManyResponse,
} from "@/lib/utils/rate-limit";
import type {
  TransactionCategory,
  TransferEvent,
} from "@/lib/utils/transactions";
import { categorizeTransaction } from "@/lib/utils/transactions";

type ChainKey = "ethereum" | "polygon";

const ALCHEMY_ENDPOINTS: Record<ChainKey, (apiKey: string) => string> = {
  ethereum: (k) => `https://eth-mainnet.g.alchemy.com/v2/${k}`,
  polygon: (k) => `https://polygon-mainnet.g.alchemy.com/v2/${k}`,
};

type JsonRpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code?: number; message?: string; data?: unknown };
};

async function rpcFetch<T>(
  url: string,
  body: { method: string; params?: unknown[] },
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
  });
  if (!res.ok) throw new Error(`Alchemy RPC failed: ${res.status}`);
  const json = (await res.json()) as JsonRpcResponse<T>;
  if (json.error) throw new Error(json.error.message || "Alchemy RPC error");
  return json.result as T as T;
}

function resolveApiKey(chain: ChainKey): string | null {
  if (chain === "ethereum") {
    return (
      process.env.ALCHEMY_API_KEY_ETHEREUM ||
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_ETHEREUM ||
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
      null
    );
  }
  if (chain === "polygon") {
    return (
      process.env.ALCHEMY_API_KEY_POLYGON ||
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_POLYGON ||
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
      null
    );
  }
  return null;
}

export async function GET(request: Request) {
  try {
    // Rate limit per client + address
    const rlKey = getClientKey(request, "transactions");
    const rl = await rateLimit(rlKey, 10, 60);
    if (!rl.allowed) return tooManyResponse(rl.resetAt);

    const url = new URL(request.url);
    const address = url.searchParams.get("address") || "";
    const chainParam = (
      url.searchParams.get("chain") || "ethereum"
    ).toLowerCase();
    const chain: ChainKey = chainParam === "polygon" ? "polygon" : "ethereum";

    if (!validateEthereumAddress(address)) {
      throw new AppError(
        ErrorCodes.INVALID_ADDRESS,
        "Invalid Ethereum address",
        400,
      );
    }

    const apiKey = resolveApiKey(chain);
    if (!apiKey) {
      throw new AppError(
        ErrorCodes.INVALID_PARAMETER,
        `Missing Alchemy API key for ${chain}`,
        400,
      );
    }

    const endpoint = ALCHEMY_ENDPOINTS[chain](apiKey);
    // Use asset transfers API for recent transfers
    // Reference: https://docs.alchemy.com/reference/alchemy_getassettransfers
    const transfers = await rpcFetch<{
      transfers: Array<{
        hash: string;
        from: string;
        to: string;
        value?: number;
        asset?: string;
        metadata?: { blockTimestamp?: string };
      }>;
    }>(endpoint, {
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromAddress: address,
          toAddress: address,
          category: ["external", "internal", "erc20", "erc721", "erc1155"],
          withMetadata: true,
          maxCount: "0x32", // 50
          order: "desc",
        },
      ],
    });

    const data: Array<TransferEvent & { category: TransactionCategory }> = (
      transfers?.transfers || []
    ).map((t) => {
      const ts = t?.metadata?.blockTimestamp
        ? Math.floor(new Date(t.metadata.blockTimestamp).getTime() / 1000)
        : undefined;
      const cat = categorizeTransaction({ from: t.from, to: t.to }, address);
      return {
        hash: t.hash,
        from: t.from,
        to: t.to,
        value: typeof t.value === "number" ? t.value : undefined,
        asset: t.asset,
        timestamp: ts,
        category: cat,
      };
    });

    return NextResponse.json({ data }, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    return handleUnknownError(error);
  }
}

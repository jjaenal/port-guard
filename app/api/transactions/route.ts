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

/**
 * Batch RPC sederhana untuk mengurangi roundtrip saat mengambil receipts/tx.
 * Komentar (ID): Menggunakan id berbasis index agar mudah menyelaraskan hasil.
 */
async function rpcBatch(
  url: string,
  calls: Array<{ method: string; params?: unknown[] }>,
): Promise<Array<JsonRpcResponse<unknown>>> {
  const payload = calls.map((c, i) => ({ jsonrpc: "2.0", id: i + 1, ...c }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Alchemy RPC batch failed: ${res.status}`);
  const json = (await res.json()) as Array<JsonRpcResponse<unknown>>;
  return json;
}

// Helper konversi hex ke number, fallback undefined jika gagal
// Komentar (ID): Hindari BigInt literal agar kompatibel dengan target ES < 2020
function hexToNumber(hex?: string | null): number | undefined {
  try {
    if (!hex) return undefined;
    const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
    const n = parseInt(normalized, 16);
    return Number.isNaN(n) ? undefined : n;
  } catch {
    return undefined;
  }
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

    // Siapkan batch pengambilan receipts dan detail transaksi untuk hitung biaya
    const list = transfers?.transfers || [];
    const hashes = list.map((t) => t.hash).filter(Boolean);

    // Batch receipts
    const receiptCalls = hashes.map((h) => ({
      method: "eth_getTransactionReceipt",
      params: [h],
    }));
    // Batch tx detail
    const txCalls = hashes.map((h) => ({
      method: "eth_getTransactionByHash",
      params: [h],
    }));

    // Komentar (ID): Jalankan batch paralel; kurangi latensi
    const [receiptBatch, txBatch] = await Promise.all([
      rpcBatch(endpoint, receiptCalls),
      rpcBatch(endpoint, txCalls),
    ]);

    // Susun map hasil berdasarkan urutan hashes
    const receiptsMap = new Map<string, unknown>();
    const txMap = new Map<string, unknown>();
    receiptBatch.forEach((r) => {
      const idx = (typeof r.id === "number" ? r.id : 1) - 1;
      const h = hashes[idx];
      if (h) receiptsMap.set(h, r.result);
    });
    txBatch.forEach((r) => {
      const idx = (typeof r.id === "number" ? r.id : 1) - 1;
      const h = hashes[idx];
      if (h) txMap.set(h, r.result);
    });

    const WEI_NUM = 1e18; // unit untuk konversi ke native (Number)

    const data: Array<
      TransferEvent & { category: TransactionCategory } & {
        gasUsed?: number;
        nonce?: number;
        fee?: number;
      }
    > = list.map((t) => {
      const ts = t?.metadata?.blockTimestamp
        ? Math.floor(new Date(t.metadata.blockTimestamp).getTime() / 1000)
        : undefined;
      const cat = categorizeTransaction({ from: t.from, to: t.to }, address);

      // Ambil receipt/tx terkait jika tersedia
      const receipt = receiptsMap.get(t.hash) as
        | { gasUsed?: string; effectiveGasPrice?: string }
        | undefined;
      const tx = txMap.get(t.hash) as
        | { nonce?: string; gasPrice?: string }
        | undefined;

      const gasUsed = receipt?.gasUsed ? hexToNumber(receipt.gasUsed) : undefined;
      const nonce = tx?.nonce ? hexToNumber(tx.nonce) : undefined;
      const priceNum =
        hexToNumber(receipt?.effectiveGasPrice) ??
        hexToNumber(tx?.gasPrice);
      let fee: number | undefined = undefined;
      if (typeof gasUsed === "number" && typeof priceNum === "number") {
        // Komentar (ID): Hitung biaya dalam native coin (ETH/MATIC) dengan Number
        // Catatan: Presisi cukup untuk rentang gasUsed dan gasPrice umum
        fee = (gasUsed * priceNum) / WEI_NUM;
      }

      return {
        hash: t.hash,
        from: t.from,
        to: t.to,
        value: typeof t.value === "number" ? t.value : undefined,
        asset: t.asset,
        timestamp: ts,
        category: cat,
        gasUsed,
        nonce,
        fee,
      };
    });

    return NextResponse.json({ data }, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    return handleUnknownError(error);
  }
}

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
import { categorizeTransactionExtended } from "@/lib/utils/transactions";

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

// Helper: konversi number ke hex (0x...)
function numberToHex(n: number): string {
  if (n <= 0) return "0x0";
  return "0x" + Math.floor(n).toString(16);
}

// Ambil block terbaru untuk estimasi range block dari tanggal
async function getLatestBlockNumber(endpoint: string): Promise<number> {
  // Komentar (ID): gunakan eth_blockNumber untuk mendapatkan block tertinggi saat ini
  const hex = await rpcFetch<string>(endpoint, { method: "eth_blockNumber" });
  return hexToNumber(hex) ?? 0;
}

// Helper: ambil timestamp sebuah blok (detik Unix) berdasarkan nomor blok
// Menggunakan panggilan standar `eth_getBlockByNumber` dengan argumen kedua `false`
// agar tidak mengembalikan daftar transaksi (mengurangi payload).
async function getBlockTimestamp(
  endpoint: string,
  blockNumber: number,
): Promise<number | undefined> {
  try {
    const blockHex = numberToHex(blockNumber);
    const block = await rpcFetch<{
      timestamp?: string;
    }>(endpoint, {
      method: "eth_getBlockByNumber",
      params: [blockHex, false],
    });
    const tsHex = (block as unknown as { timestamp?: string })?.timestamp;
    const ts = hexToNumber(tsHex);
    return typeof ts === "number" ? ts : undefined;
  } catch {
    return undefined;
  }
}

// Cache ringan untuk timestamp blok agar binary search lebih efisien
// Kunci: `${chain}:blk:${blockNumber}` dengan TTL yang sama 15 menit
const blockTimestampCache: Record<
  string,
  { savedAtMs: number; timestampSec: number }
> = {};
const BLOCK_TS_TTL = 15 * 60 * 1000; // 15 menit

async function getBlockTimestampCached(
  endpoint: string,
  chain: ChainKey,
  blockNumber: number,
): Promise<number | undefined> {
  const key = `${chain}:blk:${blockNumber}`;
  const now = Date.now();
  const hit = blockTimestampCache[key];
  if (hit && now - hit.savedAtMs < BLOCK_TS_TTL) {
    return hit.timestampSec;
  }
  const ts = await getBlockTimestamp(endpoint, blockNumber);
  if (typeof ts === "number") {
    blockTimestampCache[key] = { savedAtMs: now, timestampSec: ts };
  }
  return ts;
}

// Cache ringan untuk pemetaan tanggal (hari) → nomor blok.
// Kunci: `${chain}:${dateKey}:${bound}`; bound: "lower" | "upper".
const dateBlockCache: Record<
  string,
  { timestamp: number; blockNumber: number }
> = {};
const DATE_BLOCK_TTL = 15 * 60 * 1000; // 15 menit

// Cache agregat untuk hasil pencarian range blok (mengurangi binary search berulang)
// Kunci: `${chain}:range:${startSec}-${endSec}`
const rangeBlockCache: Record<
  string,
  { timestamp: number; fromBlock: string; toBlock: string }
> = {};
const RANGE_BLOCK_TTL = 15 * 60 * 1000; // 15 menit

/**
 * Utilitas untuk keperluan test: membersihkan cache blok dan mapping tanggal.
 * Komentar (ID): Jangan dipakai di produksi; hanya untuk isolasi unit test.
 */
function __clearBlockCachesForTest(): void {
  for (const k in blockTimestampCache) {
    delete blockTimestampCache[k];
  }
  for (const k in dateBlockCache) {
    delete dateBlockCache[k];
  }
  for (const k in rangeBlockCache) {
    delete rangeBlockCache[k];
  }
}

// Komentar (ID): Daftarkan helper pembersih cache ke global saat environment test
if (process.env.NODE_ENV === "test") {
  (globalThis as unknown as { __clearBlockCachesForTest?: () => void }).__clearBlockCachesForTest = __clearBlockCachesForTest;
}

// Binary search untuk mencari blok pertama dengan timestamp >= target (lower bound)
async function findLowerBoundBlock(
  latest: number,
  targetTsSec: number,
  cacheKey: string,
  tsFetcher: (blockNumber: number) => Promise<number | undefined>,
): Promise<number> {
  const now = Date.now();
  const cached = dateBlockCache[cacheKey];
  if (cached && now - cached.timestamp < DATE_BLOCK_TTL) {
    return cached.blockNumber;
  }

  let lo = 0;
  let hi = latest;
  let ans = 0;

  // Komentar (ID): Binary search klasik untuk mencari batas bawah berdasarkan timestamp blok.
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const ts = await tsFetcher(mid);
    if (typeof ts !== "number") {
      // Jika gagal dapat timestamp, geser agar loop terus jalan.
      hi = mid - 1;
      continue;
    }
    if (ts >= targetTsSec) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  dateBlockCache[cacheKey] = { timestamp: now, blockNumber: ans };
  return ans;
}

// Binary search untuk mendapatkan blok terakhir dengan timestamp <= target (upper bound)
async function findUpperBoundBlock(
  latest: number,
  targetTsSec: number,
  cacheKey: string,
  tsFetcher: (blockNumber: number) => Promise<number | undefined>,
): Promise<number> {
  const now = Date.now();
  const cached = dateBlockCache[cacheKey];
  if (cached && now - cached.timestamp < DATE_BLOCK_TTL) {
    return cached.blockNumber;
  }

  let lo = 0;
  let hi = latest;
  let ans = latest;

  // Komentar (ID): Cari blok terakhir yang tidak melewati timestamp target.
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const ts = await tsFetcher(mid);
    if (typeof ts !== "number") {
      lo = mid + 1;
      continue;
    }
    if (ts <= targetTsSec) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  dateBlockCache[cacheKey] = { timestamp: now, blockNumber: ans };
  return ans;
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
    // Parsing filter tanggal dari query (opsional)
    const startDateStr = url.searchParams.get("dateStart") || undefined;
    const endDateStr = url.searchParams.get("dateEnd") || undefined;
    // Komentar (ID): normalisasi rentang tanggal menjadi blok akurat via binary search (server-side)
    let fromBlockHex: string | undefined = undefined;
    let toBlockHex: string | undefined = undefined;
    if (startDateStr || endDateStr) {
      // Dapatkan block terbaru untuk batas atas binary search
      const latest = await getLatestBlockNumber(endpoint);
      // Komentar (ID): Siapkan tsFetcher yang memakai cache timestamp blok untuk efisiensi
      const tsFetcher = (bn: number) => getBlockTimestampCached(endpoint, chain, bn);
      // Normalisasi tanggal menjadi detik Unix
      const startMs = startDateStr ? new Date(startDateStr).getTime() : undefined;
      const endMsBase = endDateStr ? new Date(endDateStr).getTime() : undefined;
      const endMs = typeof endMsBase === "number" && !Number.isNaN(endMsBase)
        ? endMsBase + 86_399_999 // inklusif akhir hari
        : undefined;

      // Validasi dan jalankan binary search; paralel jika keduanya tersedia
      const hasStart = typeof startMs === "number" && !Number.isNaN(startMs);
      const hasEnd = typeof endMs === "number" && !Number.isNaN(endMs);

      if (hasStart && hasEnd) {
        // Komentar (ID): Jalankan pencarian lower & upper secara paralel untuk memangkas latensi total
        const startSec = Math.floor((startMs as number) / 1000);
        const endSec = Math.floor((endMs as number) / 1000);
        
        // Komentar (ID): Cek cache agregat range terlebih dahulu
        const rangeKey = `${chain}:range:${startSec}-${endSec}`;
        const now = Date.now();
        const cachedRange = rangeBlockCache[rangeKey];
        
        if (cachedRange && now - cachedRange.timestamp < RANGE_BLOCK_TTL) {
          // Komentar (ID): Gunakan hasil cache range jika tersedia
          fromBlockHex = cachedRange.fromBlock;
          toBlockHex = cachedRange.toBlock;
        } else {
          // Komentar (ID): Gunakan kunci cache berbasis detik target agar akurat
          // Menghindari granularitas per-jam yang bisa menyebabkan off-by-one untuk menit/detik berbeda.
          const lowerKey = `${chain}:${startSec}:lower`;
          const upperKey = `${chain}:${endSec}:upper`;

          const [lower, upper] = await Promise.all([
            findLowerBoundBlock(latest, startSec, lowerKey, tsFetcher),
            findUpperBoundBlock(latest, endSec, upperKey, tsFetcher),
          ]);
          fromBlockHex = numberToHex(Math.max(0, lower));
          toBlockHex = numberToHex(Math.min(latest, upper));
          
          // Komentar (ID): Simpan hasil ke cache agregat range
          rangeBlockCache[rangeKey] = {
            timestamp: now,
            fromBlock: fromBlockHex,
            toBlock: toBlockHex
          };
        }
      } else if (hasStart) {
        const startSec = Math.floor((startMs as number) / 1000);
        // Komentar (ID): Kunci cache langsung pakai detik target agar hasil presisi
        const lowerKey = `${chain}:${startSec}:lower`;
        const lower = await findLowerBoundBlock(latest, startSec, lowerKey, tsFetcher);
        fromBlockHex = numberToHex(Math.max(0, lower));
      } else if (hasEnd) {
        const endSec = Math.floor((endMs as number) / 1000);
        // Komentar (ID): Kunci cache langsung pakai detik target agar hasil presisi
        const upperKey = `${chain}:${endSec}:upper`;
        const upper = await findUpperBoundBlock(latest, endSec, upperKey, tsFetcher);
        toBlockHex = numberToHex(Math.min(latest, upper));
      }

      // Jika hanya satu sisi yang tersedia, isi sisi lainnya agar tetap valid
      if (fromBlockHex && !toBlockHex) {
        toBlockHex = numberToHex(latest);
      }
      if (!fromBlockHex && toBlockHex) {
        fromBlockHex = "0x0";
      }

      // Pastikan from <= to
      if (fromBlockHex && toBlockHex) {
        const fromNum = hexToNumber(fromBlockHex) ?? 0;
        const toNum = hexToNumber(toBlockHex) ?? 0;
        if (fromNum > toNum) {
          const tmp = fromBlockHex;
          fromBlockHex = toBlockHex;
          toBlockHex = tmp;
        }
      }
    }
    // Use asset transfers API for recent transfers
    // Reference: https://docs.alchemy.com/reference/alchemy_getassettransfers
    // Mendukung pagination via pageKey dari Alchemy
    const pageKeyParam = url.searchParams.get("pageKey") || undefined;
    const transfers = await rpcFetch<{
      transfers: Array<{
        hash: string;
        from: string;
        to: string;
        value?: number;
        asset?: string;
        metadata?: { blockTimestamp?: string };
      }>;
      pageKey?: string;
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
          // Komentar (ID): Jika pageKey disediakan, gunakan untuk mengambil halaman berikutnya
          pageKey: pageKeyParam,
          // Komentar (ID): Filter server-side berdasarkan estimasi blok dari rentang tanggal
          fromBlock: fromBlockHex,
          toBlock: toBlockHex,
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

      // Ambil receipt/tx terkait jika tersedia
      const receipt = receiptsMap.get(t.hash) as
        | {
            gasUsed?: string;
            effectiveGasPrice?: string;
            logs?: Array<{ address: string; topics: string[]; data: string }>;
          }
        | undefined;
      const tx = txMap.get(t.hash) as
        | { nonce?: string; gasPrice?: string; input?: string; to?: string }
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

      // Komentar (ID): Gunakan kategorisasi extended dengan data tx (input/to) dan logs
      // Ini memungkinkan deteksi swap dan LP add/remove.
      const cat = categorizeTransactionExtended(
        {
          hash: t.hash,
          from: t.from,
          to: tx?.to || t.to,
          input: tx?.input,
          logs: receipt?.logs,
        },
        address,
      );

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

    return NextResponse.json(
      { data, nextPageKey: transfers?.pageKey || null },
      { headers: { "X-Cache": "MISS" } },
    );
  } catch (error) {
    return handleUnknownError(error);
  }
}

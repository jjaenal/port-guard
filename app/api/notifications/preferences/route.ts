import { NextRequest } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache/redis";
import {
  getClientKey,
  rateLimit,
  tooManyResponse,
} from "@/lib/utils/rate-limit";
import {
  DEFAULT_PREFERENCES,
  validatePreferencesPayload,
} from "@/types/notifications";
import {
  validateEthereumAddress,
  createErrorResponse,
  ErrorCodes,
} from "@/lib/utils/api-errors";

// Key builder untuk Redis penyimpanan preferences
function prefsKey(address: string): string {
  return `notifications:preferences:${address.toLowerCase()}`;
}

// TTL penyimpanan preferences (30 hari)
const TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * GET: Mengambil preferensi notifikasi untuk address.
 * - Validasi address
 * - Rate limit untuk mencegah spam
 * - Fallback default jika belum ada data
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address") || "";

    // Validasi alamat Ethereum dasar
    if (!validateEthereumAddress(address)) {
      return createErrorResponse(ErrorCodes.INVALID_ADDRESS);
    }

    // Rate limit sederhana per client
    const rlKey = getClientKey(req, "notif-prefs:get");
    const { allowed, resetAt } = await rateLimit(rlKey, 30, 60);
    if (!allowed) return tooManyResponse(resetAt);

    // Ambil dari cache; jika tidak ada, kembalikan default
    const key = prefsKey(address);
    const stored =
      await cacheGet<ReturnType<typeof validatePreferencesPayload>>(key);
    const preferences = stored ?? { ...DEFAULT_PREFERENCES };

    return Response.json({ preferences });
  } catch {
    // Menangani error tak terduga dengan respons terstruktur
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * PUT: Menyimpan preferensi notifikasi untuk address.
 * - Validasi address
 * - Validasi payload (boolean untuk setiap field)
 * - Rate limit
 * - Simpan ke Redis dengan TTL
 */
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address") || "";

    if (!validateEthereumAddress(address)) {
      return createErrorResponse(ErrorCodes.INVALID_ADDRESS);
    }

    const rlKey = getClientKey(req, "notif-prefs:put");
    const { allowed, resetAt } = await rateLimit(rlKey, 20, 60);
    if (!allowed) return tooManyResponse(resetAt);

    // Parse dan validasi payload
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse(
        ErrorCodes.INVALID_PARAMETER,
        "Invalid JSON body",
        400,
      );
    }

    // Validasi struktur payload dan normalisasi nilai
    const preferences = validatePreferencesPayload(body);

    // Simpan ke Redis; jika Redis tidak tersedia, fungsi adalah no-op
    const key = prefsKey(address);
    await cacheSet(key, preferences, TTL_SECONDS);

    return Response.json({ success: true, preferences });
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR);
  }
}

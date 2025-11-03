import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as route from "./route";

// Mock rate limit utilities agar selalu allow dalam test ini
vi.mock("@/lib/utils/rate-limit", () => {
  return {
    rateLimit: vi.fn(async () => ({
      allowed: true,
      remaining: 10,
      resetAt: Date.now(),
    })),
    getClientKey: vi.fn(() => "test-key"),
    tooManyResponse: vi.fn(
      () => new Response("Rate limit exceeded", { status: 429 }),
    ),
  };
});

describe("/api/transactions route - date→block mapping", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    // Komentar (ID): Bersihkan cache blok & date→block via helper global agar test tidak saling mempengaruhi
    (globalThis as unknown as { __clearBlockCachesForTest?: () => void }).__clearBlockCachesForTest?.();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch as unknown as typeof fetch;
  });

  it("memetakan dateStart ke fromBlock (lower bound) dan mengisi toBlock=latest saat end kosong", async () => {
    // Siapkan API key Alchemy publik agar endpoint terbentuk
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "test";

    // Konfigurasi waktu blok sintetis: base detik + 60 detik per blok
    const latestBlock = 100;
    const baseSec = 1_700_000_000; // waktu dasar stabil
    const stepSec = 60; // 1 menit per blok

    // Variabel untuk menangkap parameter panggilan getAssetTransfers
    // Komentar (ID): Hindari nullability; gunakan objek default agar aman untuk akses properti
    let capturedParams: { fromBlock?: string; toBlock?: string } = {};

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const isAlchemy = url.includes("alchemy.com/v2/test");

      // Tangani batch kosong: payload adalah string JSON array
      if (init?.method === "POST") {
        const raw = String(init.body || "{}");
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
        } catch {
          // abaikan parsing error; lanjutkan ke cabang lain
        }
      }

      if (isAlchemy && init?.method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const method = body?.method;

        // eth_blockNumber: kembalikan latest blok sintetis
        if (method === "eth_blockNumber") {
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x" + latestBlock.toString(16) }),
            { status: 200 },
          );
        }

        // eth_getBlockByNumber: hitung timestamp heksadesimal dari nomor blok
        if (method === "eth_getBlockByNumber") {
          const blockHex = body?.params?.[0];
          const n = parseInt(String(blockHex).replace(/^0x/, ""), 16);
          const ts = baseSec + n * stepSec; // detik Unix
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: { timestamp: "0x" + ts.toString(16) } }),
            { status: 200 },
          );
        }

        // alchemy_getAssetTransfers: tangkap parameter untuk asersi
        if (method === "alchemy_getAssetTransfers") {
          // Komentar (ID): Pastikan capturedParams selalu berupa objek agar tidak mungkin null
          capturedParams = (body?.params?.[0] ?? {}) as {
            fromBlock?: string;
            toBlock?: string;
          };
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: { transfers: [], pageKey: undefined } }),
            { status: 200 },
          );
        }
      }

      // Default: kembalikan sukses kosong
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }), { status: 200 });
    }) as unknown as typeof fetch;

    // Target: pilih dateStart yang persis sama dengan timestamp blok #40
    const targetBlock = 40;
    const startSec = baseSec + targetBlock * stepSec;
    const startIso = new Date(startSec * 1000).toISOString();

    const res = await route.GET(
      new Request(
        `http://localhost/api/transactions?address=0x0000000000000000000000000000000000000000&dateStart=${encodeURIComponent(
          startIso,
        )}`,
      ),
    );
    expect(res.status).toBe(200);

    // Pastikan parameter fromBlock == #40 dan toBlock == latest
    expect(capturedParams).toBeTruthy();
    expect(capturedParams.fromBlock).toBe("0x" + targetBlock.toString(16));
    expect(capturedParams.toBlock).toBe("0x" + latestBlock.toString(16));
  });

  it("memetakan dateStart dan dateEnd sekaligus ke fromBlock dan toBlock (lower & upper bound)", async () => {
    // Siapkan API key Alchemy publik agar endpoint terbentuk
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "test";

    // Konfigurasi waktu blok sintetis: base detik + 60 detik per blok
    const latestBlock = 200;
    const baseSec = 1_700_100_000; // waktu dasar stabil berbeda dari test sebelumnya
    const stepSec = 60; // 1 menit per blok

    // Variabel untuk menangkap parameter panggilan getAssetTransfers
    // Komentar (ID): Gunakan objek default untuk hindari null dan aman akses properti
    let capturedParams: { fromBlock?: string; toBlock?: string } = {};

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const isAlchemy = url.includes("alchemy.com/v2/test");

      // Tangani batch kosong: payload adalah string JSON array
      if (init?.method === "POST") {
        const raw = String(init.body || "{}");
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
        } catch {
          // abaikan parsing error; lanjutkan ke cabang lain
        }
      }

      if (isAlchemy && init?.method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const method = body?.method;

        // eth_blockNumber: kembalikan latest blok sintetis
        if (method === "eth_blockNumber") {
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x" + latestBlock.toString(16) }),
            { status: 200 },
          );
        }

        // eth_getBlockByNumber: hitung timestamp heksadesimal dari nomor blok
        if (method === "eth_getBlockByNumber") {
          const blockHex = body?.params?.[0];
          const n = parseInt(String(blockHex).replace(/^0x/, ""), 16);
          const ts = baseSec + n * stepSec; // detik Unix
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: { timestamp: "0x" + ts.toString(16) } }),
            { status: 200 },
          );
        }

        // alchemy_getAssetTransfers: tangkap parameter untuk asersi
        if (method === "alchemy_getAssetTransfers") {
          capturedParams = (body?.params?.[0] ?? {}) as {
            fromBlock?: string;
            toBlock?: string;
          };
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: { transfers: [], pageKey: undefined } }),
            { status: 200 },
          );
        }
      }

      // Default: kembalikan sukses kosong
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }), { status: 200 });
    }) as unknown as typeof fetch;

    // Target: pilih dateStart = blok #50, dateEnd = blok #150 (inklusi akhir hari)
    const startBlock = 50;
    const endBlock = 150;
    const startSec = baseSec + startBlock * stepSec;
    const endSec = baseSec + endBlock * stepSec;
    const startIso = new Date(startSec * 1000).toISOString();
    const endIso = new Date(endSec * 1000).toISOString();

    const res = await route.GET(
      new Request(
        `http://localhost/api/transactions?address=0x0000000000000000000000000000000000000000&dateStart=${encodeURIComponent(
          startIso,
        )}&dateEnd=${encodeURIComponent(endIso)}`,
      ),
    );
    expect(res.status).toBe(200);

    // Komentar (ID): Verifikasi kedua sisi terisi dan konsisten
    expect(capturedParams).toBeTruthy();
    expect(capturedParams.fromBlock).toBe("0x" + startBlock.toString(16));
    // Komentar (ID): Karena implementasi menormalkan akhir hari (inklusi),
    // upper bound bisa melebar hingga blok terbaru pada hari yang sama.
    // Dalam model sintetis ini, toBlock akan menjadi latest.
    expect(capturedParams.toBlock).toBe("0x" + latestBlock.toString(16));
  });

  it("memetakan hanya dateEnd ke toBlock (upper bound) dan fromBlock=0x0 saat start kosong", async () => {
    // Siapkan API key Alchemy publik agar endpoint terbentuk
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = "test";

    // Konfigurasi waktu blok sintetis: base detik + 60 detik per blok
    const latestBlock = 120;
    const baseSec = 1_700_000_000;
    const stepSec = 60;

    // Komentar (ID): Gunakan objek default (tidak nullable) untuk menghindari akses null
    let capturedParams: { fromBlock?: string; toBlock?: string } = {};

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const isAlchemy = url.includes("alchemy.com/v2/test");

      // Tangani batch: payload adalah string JSON array
      if (init?.method === "POST") {
        const raw = String(init.body || "{}");
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return new Response(JSON.stringify([]), { status: 200 });
          }
        } catch {}
      }

      if (isAlchemy && init?.method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const method = body?.method;

        if (method === "eth_blockNumber") {
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x" + latestBlock.toString(16) }),
            { status: 200 },
          );
        }

        if (method === "eth_getBlockByNumber") {
          const blockHex = body?.params?.[0];
          const n = parseInt(String(blockHex).replace(/^0x/, ""), 16);
          const ts = baseSec + n * stepSec;
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: { timestamp: "0x" + ts.toString(16) } }),
            { status: 200 },
          );
        }

        if (method === "alchemy_getAssetTransfers") {
          // Komentar (ID): Normalisasi params menjadi objek agar aman dari null/undefined
          capturedParams = (body?.params?.[0] ?? {}) as {
            fromBlock?: string;
            toBlock?: string;
          };
          return new Response(
            JSON.stringify({ jsonrpc: "2.0", id: 1, result: { transfers: [], pageKey: undefined } }),
            { status: 200 },
          );
        }
      }

      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }), { status: 200 });
    }) as unknown as typeof fetch;

    // Pilih dateEnd yang jatuh di masa "kini" sintetis; toBlock harus = latest
    const targetBlock = 80;
    const endSec = baseSec + targetBlock * stepSec;
    const endIso = new Date(endSec * 1000).toISOString();

    const res = await route.GET(
      new Request(
        `http://localhost/api/transactions?address=0x0000000000000000000000000000000000000000&dateEnd=${encodeURIComponent(
          endIso,
        )}`,
      ),
    );
    expect(res.status).toBe(200);

    // Pastikan hanya toBlock terisi dan fromBlock default ke 0x0
    expect(capturedParams).toBeTruthy();
    expect(capturedParams.fromBlock).toBe("0x0");
    expect(capturedParams.toBlock).toBe("0x" + latestBlock.toString(16));
  });
});
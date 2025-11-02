/**
 * Util untuk mengekspor transaksi terfilter ke format CSV.
 *
 * - Menghasilkan baris header dan baris data untuk setiap transaksi
 * - Menangani nilai undefined dengan string kosong
 * - Meng-escape karakter kutip dan koma agar aman untuk CSV
 * - Mengubah timestamp (detik) ke ISO string jika tersedia
 *
 * Komentar (ID): Menghindari deep nesting dan memastikan performa dengan
 * operasi linear sederhana pada array input.
 */
export type ExportTxItem = {
  hash: string;
  from: string;
  to: string;
  value?: number;
  asset?: string;
  timestamp?: number; // detik epoch
  category: string; // gunakan string umum agar tidak bergantung pada tipe komponen
  // Kolom tambahan untuk analisis biaya transaksi (opsional)
  // Komentar (ID): Tidak semua sumber data menyediakan ini; biarkan kosong jika tidak ada
  gasUsed?: number; // jumlah gas yang terpakai (unit gas)
  nonce?: number; // nonce transaksi dari pengirim
  fee?: number; // biaya transaksi dalam native coin (mis. ETH/MATIC)
};

/**
 * Escape nilai sel CSV: mengganti kutip ganda dan membungkus dengan kutip
 * jika mengandung koma, kutip, atau newline.
 */
function escapeCsv(value: string): string {
  const needsQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/**
 * Konversi list transaksi menjadi string CSV.
 * @param items - daftar transaksi yang akan diekspor
 * @param chain - nama chain (misal: 'ethereum' atau 'polygon') untuk kolom tambahan
 * @returns string CSV siap didownload
 */
export function toCsv(items: ExportTxItem[], chain: string): string {
  // Header kolom yang jelas agar mudah dipakai di spreadsheet
  const header = [
    "hash",
    "from",
    "to",
    "value",
    "asset",
    "timestamp_iso",
    "category",
    "chain",
    // Header kolom tambahan
    "gas_used",
    "nonce",
    "fee_native",
  ].join(",");

  // Early return untuk list kosong
  if (!items || items.length === 0) {
    return `${header}\n`; // tetap kembalikan header agar file valid
  }

  const rows = items.map((it) => {
    const tsIso = typeof it.timestamp === "number"
      ? new Date(it.timestamp * 1000).toISOString()
      : "";
    const cells = [
      escapeCsv(it.hash ?? ""),
      escapeCsv(it.from ?? ""),
      escapeCsv(it.to ?? ""),
      escapeCsv(typeof it.value === "number" ? String(it.value) : ""),
      escapeCsv(it.asset ?? ""),
      escapeCsv(tsIso),
      escapeCsv(it.category ?? ""),
      escapeCsv(chain ?? ""),
      // Nilai tambahan; gunakan empty string bila undefined
      escapeCsv(typeof it.gasUsed === "number" ? String(it.gasUsed) : ""),
      escapeCsv(typeof it.nonce === "number" ? String(it.nonce) : ""),
      escapeCsv(typeof it.fee === "number" ? String(it.fee) : ""),
    ];
    return cells.join(",");
  });

  return `${header}\n${rows.join("\n")}\n`;
}
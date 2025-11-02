import { describe, it, expect } from "vitest";
import { toCsv, type ExportTxItem } from "./transactions-export";

describe("transactions-export toCsv", () => {
  it("menghasilkan header saat items kosong", () => {
    const csv = toCsv([], "ethereum");
    expect(
      csv.startsWith(
        "hash,from,to,value,asset,timestamp_iso,category,chain,gas_used,nonce,fee_native\n",
      ),
    ).toBe(true);
  });

  it("mengekspor satu transaksi dengan semua kolom", () => {
    const items: ExportTxItem[] = [
      {
        hash: "0xabc",
        from: "0xfrom",
        to: "0xto",
        value: 1.23,
        asset: "ETH",
        timestamp: 1700000000,
        category: "swap",
      },
    ];
    const csv = toCsv(items, "ethereum");
    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe(
      "hash,from,to,value,asset,timestamp_iso,category,chain,gas_used,nonce,fee_native",
    );
    // cek kolom chain dan category
    expect(lines[1]).toContain(",swap,ethereum,,,");
  });

  it("meng-escape koma dan kutip dengan benar", () => {
    const items: ExportTxItem[] = [
      {
        hash: '0x"quoted",comma',
        from: "0x1",
        to: "0x2",
        category: "send",
      },
    ];
    const csv = toCsv(items, "polygon");
    const line = csv.trim().split("\n")[1];
    // Komentar (ID): Cell pertama dibungkus kutip, kutip di-escape ("")
    // dan koma di dalam tetap satu sel sebelum kolom berikutnya.
    expect(line.startsWith('"0x""quoted""",comma",0x1,0x2,')).toBe(false);
    expect(line.startsWith('"0x""quoted"",comma",0x1,0x2,')).toBe(true);
    // Suffix harus berisi kategori dan chain sesuai input
    expect(line.endsWith(",send,polygon,,,"))
      .toBe(true);
  });
});
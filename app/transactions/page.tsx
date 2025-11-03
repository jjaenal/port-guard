"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { formatTimestamp, type TransactionCategory } from "@/lib/utils/transactions";
import { toCsv } from "@/lib/utils/transactions-export";

type TxItem = {
  hash: string;
  from: string;
  to: string;
  value?: number;
  asset?: string;
  timestamp?: number;
  category: TransactionCategory;
  // Kolom biaya transaksi (opsional, tergantung API)
  gasUsed?: number;
  nonce?: number;
  fee?: number; // dalam native coin (ETH/MATIC)
};

const ADDRESS_STORAGE_KEY = "tx_address";
const CHAIN_STORAGE_KEY = "tx_chain";
const FILTERS_STORAGE_KEY = "tx_filters";
const PRESET_STORAGE_KEY = "tx_preset"; // Tambah key untuk preset

export default function TransactionsPage() {
  const { address: connected } = useAccount();
  // Chain ID dari wallet (wagmi) untuk sinkronisasi chain state
  const chainId = useChainId();
  const [address, setAddress] = useState<string>(connected || "");
  const [chain, setChain] = useState<"ethereum" | "polygon">("ethereum");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TxItem[]>([]);
  // Opsi ekspor: hasil terfilter atau semua hasil
  const [exportScope, setExportScope] = useState<"filtered" | "all">("filtered");
  // Flag untuk menghindari hydration mismatch: render badge hanya setelah mount
  const [mounted, setMounted] = useState(false);
  // State filter kategori transaksi
  // Catatan (ID): kita gunakan objek flat agar mudah toggle tanpa deep nesting
  const [filters, setFilters] = useState<Record<TransactionCategory, boolean>>({
    send: true,
    receive: true,
    swap: true,
    approve: true,
    lp_add: true,
    lp_remove: true,
    contract_interaction: true,
    unknown: true,
  });
  // State untuk preset aktif
  const [activePreset, setActivePreset] = useState<string>("ALL");
  // State untuk modal konfirmasi reset
  const [showResetModal, setShowResetModal] = useState(false);

  // Muat filter tersimpan saat komponen mount
  useEffect(() => {
    setMounted(true);
    try {
      // Komentar (ID): pastikan hanya berjalan di client
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<TransactionCategory, boolean>>;
      const next: Record<TransactionCategory, boolean> = {
        send: parsed.send ?? true,
        receive: parsed.receive ?? true,
        swap: parsed.swap ?? true,
        approve: parsed.approve ?? true,
        lp_add: parsed.lp_add ?? true,
        lp_remove: parsed.lp_remove ?? true,
        contract_interaction: parsed.contract_interaction ?? true,
        unknown: parsed.unknown ?? true,
      };
      setFilters(next);
      
      // Load preset tersimpan
      const savedPreset = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (savedPreset) {
        setActivePreset(savedPreset);
      }
    } catch {
      // Abaikan error parsing storage
    }
  }, []);

  // Muat address & chain tersimpan saat mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const savedAddr = window.localStorage.getItem(ADDRESS_STORAGE_KEY) || "";
      const savedChain = window.localStorage.getItem(CHAIN_STORAGE_KEY);

      // Jika wallet belum terkoneksi, gunakan address tersimpan
      if (!connected && savedAddr) {
        setAddress(savedAddr);
      }
      // Validasi nilai chain sebelum set
      if (savedChain === "ethereum" || savedChain === "polygon") {
        setChain(savedChain);
      }
    } catch {
      // Abaikan error storage
    }
    // Depend on "connected" agar saat user connect, efek ini tidak override address terkoneksi
  }, [connected]);

  // Sinkronkan chain dengan network wallet jika dikenal (Ethereum mainnet / Polygon)
  useEffect(() => {
    // Komentar (ID): Hindari override jika chainId tidak dikenali
    if (typeof chainId !== "number") return;
    if (chainId === 1) {
      setChain("ethereum");
      return;
    }
    if (chainId === 137) {
      setChain("polygon");
      return;
    }
    // Jika chain lain (mis. testnet), jangan paksa override
  }, [chainId]);

  // Simpan filter ke localStorage setiap berubah
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Abaikan error quota/storage
    }
  }, [filters]);

  // Simpan preset ke localStorage setiap berubah
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(PRESET_STORAGE_KEY, activePreset);
    } catch {
      // Abaikan error storage
    }
  }, [activePreset]);

  // Persist address setiap kali berubah
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(ADDRESS_STORAGE_KEY, address);
    } catch {
      // Abaikan error storage
    }
  }, [address]);

  // Persist chain setiap kali berubah
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(CHAIN_STORAGE_KEY, chain);
    } catch {
      // Abaikan error storage
    }
  }, [chain]);

  // Sinkronkan address dengan wallet terkoneksi (prioritas ke wallet)
  useEffect(() => {
    if (!connected) return;
    // Komentar (ID): Saat wallet terkoneksi, kita gunakan address dari wallet
    setAddress(connected);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ADDRESS_STORAGE_KEY, connected);
      }
    } catch {
      // Abaikan error
    }
  }, [connected]);

  // Helper untuk toggle filter kategori tertentu
  function toggleFilter(cat: TransactionCategory) {
    setFilters((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  // Preset filter untuk mempercepat seleksi umum
  // Catatan (ID): gunakan mapping eksplisit agar mudah dievaluasi dan diperluas
  function applyPreset(preset: "ALL" | "TRANSFERS" | "DEFI" | "STAKING" | "INBOUND" | "OUTBOUND" | "NONE") {
    setActivePreset(preset); // Update preset aktif
    switch (preset) {
      case "ALL":
        setFilters({ send: true, receive: true, swap: true, approve: true, lp_add: true, lp_remove: true, contract_interaction: true, unknown: true });
        return;
      case "TRANSFERS":
        setFilters({ send: true, receive: true, swap: false, approve: false, lp_add: false, lp_remove: false, contract_interaction: false, unknown: false });
        return;
      case "DEFI":
        setFilters({ send: false, receive: false, swap: true, approve: true, lp_add: true, lp_remove: true, contract_interaction: true, unknown: false });
        return;
      case "STAKING":
        setFilters({ send: false, receive: false, swap: false, approve: false, lp_add: true, lp_remove: true, contract_interaction: false, unknown: false });
        return;
      case "INBOUND":
        setFilters({ send: false, receive: true, swap: false, approve: false, lp_add: false, lp_remove: false, contract_interaction: false, unknown: false });
        return;
      case "OUTBOUND":
        setFilters({ send: true, receive: false, swap: false, approve: true, lp_add: false, lp_remove: false, contract_interaction: true, unknown: false });
        return;
      case "NONE":
        setFilters({ send: false, receive: false, swap: false, approve: false, lp_add: false, lp_remove: false, contract_interaction: false, unknown: false });
        return;
      default:
        return;
    }
  }

  async function fetchTx() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ address, chain });
      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        try {
          const j = JSON.parse(text);
          throw new Error(
            j?.error?.message || `Transactions API error: ${res.status}`,
          );
        } catch {
          throw new Error(`Transactions API error: ${res.status} ${text}`);
        }
      }
      const json = await res.json();
      setItems((json?.data || []) as TxItem[]);
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }

  // Hitung header dengan jumlah hasil setelah filter diterapkan
  // Catatan (ID): gunakan useMemo untuk menghindari komputasi ulang berlebih
  const filteredItems = useMemo(() => {
    return items.filter((tx) => filters[tx.category]);
  }, [items, filters]);

  // Hitung jumlah per kategori untuk badge di tombol filter
  const categoryCounts = useMemo(() => {
    const counts: Record<TransactionCategory, number> = {
      send: 0,
      receive: 0,
      swap: 0,
      approve: 0,
      lp_add: 0,
      lp_remove: 0,
      contract_interaction: 0,
      unknown: 0,
    };
    for (const tx of items) {
      counts[tx.category] += 1;
    }
    return counts;
  }, [items]);

  // Hitung jumlah filter aktif untuk indikator
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  const header = useMemo(() => {
    const total = items.length;
    const shown = filteredItems.length;
    // Komentar (ID): Gunakan jumlah kategori dinamis agar tidak hardcode saat kategori baru ditambah
    const totalCats = Object.keys(filters).length;
    const filterInfo = activeFiltersCount === totalCats ? "" : ` • Active filters: ${activeFiltersCount}/${totalCats}`;
    if (total === 0) return `No transactions${filterInfo}`;
    return shown === total ? `${total} transactions${filterInfo}` : `${shown} of ${total} transactions${filterInfo}`;
  }, [items.length, filteredItems.length, activeFiltersCount, filters]);

  // Utility kecil untuk style tombol filter berdasarkan kategori dan aktif/tidak
  function filterButtonClass(cat: TransactionCategory): string {
    const active = filters[cat];
    // Warna konsisten dengan badge di daftar
    const base = "px-2 py-1 text-sm border rounded transition-colors";
    if (!active) return `${base} bg-white border-gray-300 text-gray-600`;
    switch (cat) {
      case "send":
        return `${base} bg-red-50 border-red-300 text-red-700`;
      case "receive":
        return `${base} bg-green-50 border-green-300 text-green-700`;
      case "swap":
        return `${base} bg-blue-50 border-blue-300 text-blue-700`;
      case "approve":
        return `${base} bg-indigo-50 border-indigo-300 text-indigo-700`;
      case "lp_add":
        return `${base} bg-purple-50 border-purple-300 text-purple-700`;
      case "lp_remove":
        return `${base} bg-orange-50 border-orange-300 text-orange-700`;
      case "contract_interaction":
        return `${base} bg-yellow-50 border-yellow-300 text-yellow-700`;
      default:
        return `${base} bg-gray-50 border-gray-300 text-gray-700`;
    }
  }

  // Tombol Reset: kembalikan address/chain/filter ke default dan bersihkan storage
  function resetAll() {
    // Komentar (ID): Hapus nilai persisten di localStorage secara aman
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ADDRESS_STORAGE_KEY);
        window.localStorage.removeItem(CHAIN_STORAGE_KEY);
        window.localStorage.removeItem(FILTERS_STORAGE_KEY);
        window.localStorage.removeItem(PRESET_STORAGE_KEY);
      }
    } catch {
      // Abaikan error storage/quota
    }
    // Komentar (ID): Reset state ke default yang konsisten
    setAddress(connected || "");
    setChain("ethereum");
    setFilters({ send: true, receive: true, swap: true, approve: true, lp_add: true, lp_remove: true, contract_interaction: true, unknown: true });
    setActivePreset("ALL");
    setError(null);
    setShowResetModal(false);
  }

  // Konfirmasi reset dengan modal
  function confirmReset() {
    resetAll();
  }

  // Tombol Clear Results: bersihkan hasil fetch tanpa mengubah input & filter
  function clearResults() {
    // Komentar (ID): Mengosongkan daftar transaksi dan error agar UI kembali ke state awal
    setItems([]);
    setError(null);
  }

  // Ekspor hasil transaksi terfilter ke CSV dan unduh sebagai file
  function exportCsv() {
    // Komentar (ID): Tentukan sumber data berdasarkan exportScope
    const source = exportScope === "filtered" ? filteredItems : items;
    // Komentar (ID): Hindari operasi jika tidak ada data
    if (!source || source.length === 0) return;
    // Konversi ke CSV string dengan menambahkan kolom chain
    const csv = toCsv(
      source.map((it) => ({
        hash: it.hash,
        from: it.from,
        to: it.to,
        value: typeof it.value === "number" ? it.value : undefined,
        asset: it.asset,
        timestamp: typeof it.timestamp === "number" ? it.timestamp : undefined,
        category: it.category,
        // Sertakan kolom biaya jika tersedia
        gasUsed: typeof it.gasUsed === "number" ? it.gasUsed : undefined,
        nonce: typeof it.nonce === "number" ? it.nonce : undefined,
        fee: typeof it.fee === "number" ? it.fee : undefined,
      })),
      chain,
    );
    // Buat Blob dan trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `transactions-${chain}-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Transaction History</h1>
      <div className="flex flex-col gap-3 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="Wallet address (0x...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="flex gap-2 items-center">
          <label className="text-sm">Chain:</label>
          <select
            className="border rounded px-2 py-1"
            value={chain}
            onChange={(e) => setChain(e.target.value as "ethereum" | "polygon")}
          >
            <option value="ethereum">Ethereum</option>
            <option value="polygon">Polygon</option>
          </select>
          <button
            className="ml-auto bg-black text-white px-3 py-2 rounded"
            onClick={fetchTx}
            disabled={!address || isLoading}
          >
            {isLoading ? "Loading..." : "Fetch"}
          </button>
          {/* Tombol Reset untuk mengembalikan input & filter ke default */}
          <button
            type="button"
            className="ml-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50"
            onClick={() => setShowResetModal(true)}
            disabled={isLoading}
          >
            Reset
          </button>
          {/* Tombol Clear Results untuk menghapus hasil & error */}
          <button
            type="button"
            className="ml-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50"
            onClick={clearResults}
            disabled={isLoading}
          >
            Clear Results
          </button>
          {/* Tombol Export CSV untuk menyimpan hasil terfilter */}
          {/* Komentar (ID): Tambah kontrol kecil untuk memilih cakupan ekspor */}
          <label className="ml-2 text-sm text-gray-600" htmlFor="exportScope">
            Export:
          </label>
          <select
            id="exportScope"
            className="ml-1 bg-white border border-gray-300 text-gray-700 px-2 py-2 rounded hover:bg-gray-50"
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value as "filtered" | "all")}
            disabled={isLoading}
          >
            <option value="filtered">Terfilter</option>
            <option value="all">Semua</option>
          </select>
          <button
            type="button"
            className="ml-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50"
            onClick={exportCsv}
            disabled={
              isLoading ||
              (exportScope === "filtered" ? filteredItems.length === 0 : items.length === 0)
            }
          >
            Export CSV
          </button>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Kontrol filter kategori transaksi */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600">Filter:</span>
          <button
            type="button"
            className={filterButtonClass("send")}
            onClick={() => toggleFilter("send")}
          aria-pressed={filters.send}
        >
          SEND{mounted ? ` (${categoryCounts.send})` : ""}
        </button>
          <button
            type="button"
            className={filterButtonClass("receive")}
            onClick={() => toggleFilter("receive")}
          aria-pressed={filters.receive}
        >
          RECEIVE{mounted ? ` (${categoryCounts.receive})` : ""}
        </button>
          <button
            type="button"
            className={filterButtonClass("swap")}
            onClick={() => toggleFilter("swap")}
          aria-pressed={filters.swap}
        >
          🔄 SWAP{mounted ? ` (${categoryCounts.swap})` : ""}
        </button>
          <button
            type="button"
            className={filterButtonClass("approve")}
            onClick={() => toggleFilter("approve")}
          aria-pressed={filters.approve}
        >
          ✅ APPROVE{mounted ? ` (${categoryCounts.approve})` : ""}
        </button>
          <button
            type="button"
            className={filterButtonClass("lp_add")}
            onClick={() => toggleFilter("lp_add")}
          aria-pressed={filters.lp_add}
        >
          ➕ LP ADD{mounted ? ` (${categoryCounts.lp_add})` : ""}
        </button>
        <button
          type="button"
          className={filterButtonClass("lp_remove")}
          onClick={() => toggleFilter("lp_remove")}
          aria-pressed={filters.lp_remove}
        >
          ➖ LP REMOVE{mounted ? ` (${categoryCounts.lp_remove})` : ""}
        </button>
        <button
          type="button"
          className={filterButtonClass("contract_interaction")}
          onClick={() => toggleFilter("contract_interaction")}
          aria-pressed={filters.contract_interaction}
        >
          ⚙️ CONTRACT{mounted ? ` (${categoryCounts.contract_interaction})` : ""}
        </button>
        <button
          type="button"
          className={filterButtonClass("unknown")}
          onClick={() => toggleFilter("unknown")}
          aria-pressed={filters.unknown}
        >
          UNKNOWN{mounted ? ` (${categoryCounts.unknown})` : ""}
        </button>
          {/* Preset cepat untuk skenario umum */}
          <span className="mx-2 text-sm text-gray-400">|</span>
          <span className="text-xs text-gray-500">Active: {activePreset}</span>
          <button
            type="button"
            className={`px-2 py-1 text-sm border rounded hover:bg-gray-50 ${
              activePreset === "ALL"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            onClick={() => applyPreset("ALL")}
          >
            ALL
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm border rounded hover:bg-gray-50 ${
              activePreset === "TRANSFERS"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            onClick={() => applyPreset("TRANSFERS")}
          >
            TRANSFERS
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm border rounded hover:bg-gray-50 ${
              activePreset === "DEFI"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            onClick={() => applyPreset("DEFI")}
          >
            DEFI
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm border rounded hover:bg-gray-50 ${
              activePreset === "STAKING"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            onClick={() => applyPreset("STAKING")}
          >
            STAKING
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm border rounded hover:bg-gray-50 ${
              activePreset === "INBOUND"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            onClick={() => applyPreset("INBOUND")}
          >
            INBOUND
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm border rounded hover:bg-gray-50 ${
              activePreset === "OUTBOUND"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            onClick={() => applyPreset("OUTBOUND")}
          >
            OUTBOUND
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-sm border rounded hover:bg-gray-50 ${
              activePreset === "NONE"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            onClick={() => applyPreset("NONE")}
          >
            NONE
          </button>
        </div>
      </div>

      <div className="rounded border">
        <div className="px-3 py-2 border-b text-sm text-gray-600">{header}</div>
        <div>
          {/* Tampilkan transaksi yang lolos filter */}
          {filteredItems.map((tx) => (
            <div
              key={tx.hash}
              className="px-3 py-3 border-b flex flex-col gap-1"
            >
              <div className="flex gap-2 items-center">
                <span
                  className={
                    tx.category === "send"
                      ? "text-red-600"
                      : tx.category === "receive"
                        ? "text-green-600"
                        : tx.category === "swap"
                          ? "text-blue-600"
                          : tx.category === "approve"
                            ? "text-indigo-600"
                          : tx.category === "lp_add"
                            ? "text-purple-600"
                          : tx.category === "lp_remove"
                            ? "text-orange-600"
                          : tx.category === "contract_interaction"
                            ? "text-yellow-600"
                            : "text-gray-600"
                  }
                >
                  {tx.category === "swap" 
                    ? "🔄 SWAP" 
                    : tx.category === "approve"
                      ? "✅ APPROVE"
                    : tx.category === "lp_add"
                      ? "➕ LP ADD"
                      : tx.category === "lp_remove"
                        ? "➖ LP REMOVE"
                        : tx.category === "contract_interaction"
                          ? "⚙️ CONTRACT"
                        : tx.category.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(tx.timestamp)}
                </span>
              </div>
              <div className="text-sm break-all">
                <div>
                  <span className="font-mono">{tx.hash}</span>
                </div>
                <div className="text-gray-700">
                  <span className="font-mono">{tx.from}</span>
                  <span className="mx-1">→</span>
                  <span className="font-mono">{tx.to}</span>
                </div>
                <div className="text-gray-700">
                  {typeof tx.value === "number" && (
                    <span>
                      {tx.value}{" "}
                      {tx.asset || (chain === "polygon" ? "MATIC" : "ETH")}
                    </span>
                  )}
                </div>
                {/* Badge biaya gas + tautan explorer */}
                <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                  {/* Komentar (ID): Tampilkan biaya gas dengan format rapi (max 6 desimal, tanpa trailing zero) */}
                  {typeof tx.fee === "number" && (
                    <span className="px-1.5 py-0.5 border rounded bg-gray-50">
                      Gas: {parseFloat(tx.fee.toFixed(6))} {chain === "polygon" ? "MATIC" : "ETH"}
                    </span>
                  )}
                  {/* Komentar (ID): Tautan ke block explorer dengan icon untuk kemudahan identifikasi */}
                  <a
                    href={`${chain === "polygon" ? "https://polygonscan.com/tx/" : "https://etherscan.io/tx/"}${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    🔗 View on Explorer
                  </a>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              No transactions fetched yet
            </div>
          )}
        </div>
      </div>

      {/* Modal konfirmasi reset */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-3">Konfirmasi Reset</h3>
            <p className="text-gray-600 mb-4">
              Yakin ingin mereset semua input, filter, dan preset ke default? 
              Data tersimpan di localStorage akan dihapus.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => setShowResetModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={confirmReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

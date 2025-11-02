"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { formatTimestamp, type TransactionCategory } from "@/lib/utils/transactions";

type TxItem = {
  hash: string;
  from: string;
  to: string;
  value?: number;
  asset?: string;
  timestamp?: number;
  category: TransactionCategory;
};

export default function TransactionsPage() {
  const { address: connected } = useAccount();
  const [address, setAddress] = useState<string>(connected || "");
  const [chain, setChain] = useState<"ethereum" | "polygon">("ethereum");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TxItem[]>([]);

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

  const header = useMemo(() => {
    const count = items.length;
    return count > 0 ? `${count} transactions` : "No transactions";
  }, [items.length]);

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
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      <div className="rounded border">
        <div className="px-3 py-2 border-b text-sm text-gray-600">{header}</div>
        <div>
          {items.map((tx) => (
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
                          : tx.category === "lp_add"
                            ? "text-purple-600"
                            : tx.category === "lp_remove"
                              ? "text-orange-600"
                              : "text-gray-600"
                  }
                >
                  {tx.category === "swap" 
                    ? "🔄 SWAP" 
                    : tx.category === "lp_add"
                      ? "➕ LP ADD"
                      : tx.category === "lp_remove"
                        ? "➖ LP REMOVE"
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
    </div>
  );
}

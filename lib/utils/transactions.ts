export type TransactionCategory = "send" | "receive" | "unknown";

export type TransferEvent = {
  hash: string;
  from: string;
  to: string;
  value?: number; // native value in ETH/MATIC, optional
  asset?: string; // token symbol if available
  timestamp?: number; // unix seconds
};

/**
 * Categorize a transfer relative to a wallet address.
 * - send: address is the sender
 * - receive: address is the recipient
 * - unknown: cannot be determined
 */
export function categorizeTransaction(
  tx: Pick<TransferEvent, "from" | "to">,
  address: string,
): TransactionCategory {
  const addr = address.toLowerCase();
  const from = (tx.from || "").toLowerCase();
  const to = (tx.to || "").toLowerCase();

  if (addr && from === addr && to && to !== addr) return "send";
  if (addr && to === addr && from && from !== addr) return "receive";
  return "unknown";
}

/**
 * Formats a timestamp (unix seconds) into a short date-time string.
 */
export function formatTimestamp(ts?: number): string {
  if (!ts) return "";
  try {
    const d = new Date(ts * 1000);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return "";
  }
}

export type TransactionCategory = "send" | "receive" | "swap" | "unknown";

export type TransferEvent = {
  hash: string;
  from: string;
  to: string;
  value?: number; // native value in ETH/MATIC, optional
  asset?: string; // token symbol if available
  timestamp?: number; // unix seconds
};

export type SwapTransaction = {
  hash: string;
  to: string; // contract address (router/pool)
  input?: string; // transaction input data
  logs?: Array<{
    address: string; // token contract address
    topics: string[]; // event topics
    data: string; // event data
  }>;
};

// Alamat router DEX yang umum (lowercase untuk perbandingan)
const KNOWN_DEX_ROUTERS = new Set([
  // Uniswap V2 Router
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  // Uniswap V3 Router
  "0xe592427a0aece92de3edee1f18e0157c05861564",
  // Uniswap Universal Router
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
  // SushiSwap Router
  "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f",
  // 1inch Router V5
  "0x1111111254eeb25477b68fb85ed929f73a960582",
  // PancakeSwap Router (jika multi-chain)
  "0x10ed43c718714eb63d5aa57b78b54704e256024e",
]);

// Function selector untuk swap functions yang umum
const SWAP_FUNCTION_SELECTORS = new Set([
  "0x7ff36ab5", // swapExactETHForTokens
  "0x18cbafe5", // swapExactTokensForETH
  "0x38ed1739", // swapExactTokensForTokens
  "0x8803dbee", // swapTokensForExactTokens
  "0x414bf389", // swapExactETHForTokensSupportingFeeOnTransferTokens
  "0xb6f9de95", // swapExactTokensForETHSupportingFeeOnTransferTokens
  "0x5c11d795", // swapExactTokensForTokensSupportingFeeOnTransferTokens
  "0x472b43f3", // swapExactInputSingle (Uniswap V3)
  "0x09b81346", // swapExactInput (Uniswap V3)
  "0x61d027b3", // swapExactOutputSingle (Uniswap V3)
  "0x0d7d75e4", // swapExactOutput (Uniswap V3)
]);

// Transfer event topic (ERC-20 Transfer event signature)
const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

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

/**
 * Deteksi apakah transaksi adalah swap berdasarkan heuristik.
 * 
 * Menggunakan beberapa indikator:
 * 1. Alamat tujuan adalah router DEX yang dikenal
 * 2. Function selector cocok dengan fungsi swap
 * 3. Pola Transfer events menunjukkan pertukaran token
 * 
 * @param tx - Data transaksi dengan alamat tujuan, input, dan logs
 * @returns true jika terdeteksi sebagai swap
 */
export function detectSwap(tx: SwapTransaction): boolean {
  if (!tx.to) return false;

  const toAddress = tx.to.toLowerCase();
  
  // Heuristik 1: Cek apakah alamat tujuan adalah router DEX yang dikenal
  const isKnownRouter = KNOWN_DEX_ROUTERS.has(toAddress);
  
  // Heuristik 2: Cek function selector dari input data
  let hasSwapSelector = false;
  if (tx.input && tx.input.length >= 10) {
    const selector = tx.input.slice(0, 10).toLowerCase();
    hasSwapSelector = SWAP_FUNCTION_SELECTORS.has(selector);
  }
  
  // Heuristik 3: Analisis Transfer events untuk pola swap
  let hasSwapPattern = false;
  if (tx.logs && tx.logs.length >= 2) {
    // Cari Transfer events (minimal 2 untuk swap)
    const transferEvents = tx.logs.filter(log => 
      log.topics.length > 0 && 
      log.topics[0].toLowerCase() === TRANSFER_EVENT_TOPIC
    );
    
    // Swap biasanya memiliki minimal 2 Transfer events
    // dan melibatkan alamat yang berbeda (token contracts)
    if (transferEvents.length >= 2) {
      const uniqueTokens = new Set(transferEvents.map(e => e.address.toLowerCase()));
      hasSwapPattern = uniqueTokens.size >= 2; // Minimal 2 token berbeda
    }
  }
  
  // Transaksi dianggap swap jika memenuhi minimal 2 dari 3 heuristik
  // atau jika router dikenal + ada selector swap
  const heuristicCount = [isKnownRouter, hasSwapSelector, hasSwapPattern].filter(Boolean).length;
  
  return heuristicCount >= 2 || (isKnownRouter && hasSwapSelector);
}

/**
 * Kategorisasi transaksi yang diperluas dengan deteksi swap.
 * 
 * @param tx - Data transaksi dengan informasi transfer dan swap
 * @param address - Alamat wallet untuk kategorisasi
 * @returns Kategori transaksi termasuk "swap" jika terdeteksi
 */
export function categorizeTransactionExtended(
  tx: TransferEvent & Partial<SwapTransaction>,
  address: string,
): TransactionCategory {
  // Cek dulu apakah ini swap
  if (tx.to && (tx.input || tx.logs)) {
    const swapTx: SwapTransaction = {
      hash: tx.hash,
      to: tx.to,
      input: tx.input,
      logs: tx.logs,
    };
    
    if (detectSwap(swapTx)) {
      return "swap";
    }
  }
  
  // Fallback ke kategorisasi standar
  return categorizeTransaction(tx, address);
}

export type TransactionCategory = "send" | "receive" | "swap" | "approve" | "lp_add" | "lp_remove" | "contract_interaction" | "unknown";

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
// Approval event topic (ERC-20 Approval event signature)
const APPROVAL_EVENT_TOPIC = "0x8c5be1e5ebec7d5bd14f714f8fcb61fefaa3c4af2a1a0b1b5b5f41e7e81c0b02";

// Event topics untuk Liquidity Provision detection
const MINT_EVENT_TOPIC = "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"; // Mint(address,uint256,uint256)
const BURN_EVENT_TOPIC = "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"; // Burn(address,uint256,uint256,address)

// Note: LP factory addresses bisa ditambahkan nanti untuk heuristik tambahan
// const KNOWN_LP_FACTORIES untuk validasi alamat pool jika diperlukan

// Function selectors untuk LP operations
const LP_FUNCTION_SELECTORS = new Set([
  "0xe8e33700", // addLiquidity
  "0xf305d719", // addLiquidityETH
  "0xbaa2abde", // removeLiquidity
  "0x02751cec", // removeLiquidityETH
  "0xaf2979eb", // removeLiquidityETHSupportingFeeOnTransferTokens
  "0xded9382a", // removeLiquidityETHWithPermit
  "0x2195995c", // removeLiquidityWithPermit
  "0x219f5d17", // increaseLiquidity (Uniswap V3)
  "0x0c49ccbe", // decreaseLiquidity (Uniswap V3)
]);

// Function selector untuk ERC-20 approve
const APPROVE_FUNCTION_SELECTORS = new Set([
  "0x095ea7b3", // approve(address spender, uint256 value)
]);

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
 * Deteksi apakah transaksi adalah Liquidity Add (LP Add).
 * 
 * Menggunakan 3 heuristik:
 * 1. Function selector untuk add liquidity operations
 * 2. Mint event dalam logs (menandakan LP token baru dibuat)
 * 3. Pola transfer: user mengirim 2+ token, menerima LP token
 * 
 * @param tx - Data transaksi dengan input dan logs
 * @returns true jika terdeteksi sebagai LP Add
 */
export function detectLPAdd(tx: SwapTransaction): boolean {
  if (!tx.to) return false;

  // Heuristik 1: Function selector untuk add liquidity
  const hasAddLPSelector = tx.input && LP_FUNCTION_SELECTORS.has(tx.input.slice(0, 10).toLowerCase());
  
  // Heuristik 2: Ada Mint event (LP token dibuat)
  const hasMintEvent = tx.logs?.some(log => 
    log.topics[0]?.toLowerCase() === MINT_EVENT_TOPIC.toLowerCase()
  ) || false;
  
  // Heuristik 3: Pola transfer - user mengirim multiple tokens, menerima LP token
  // Cari Transfer events dari user ke pool/router dan dari pool ke user
  const transferEvents = tx.logs?.filter(log => 
    log.topics[0]?.toLowerCase() === TRANSFER_EVENT_TOPIC.toLowerCase()
  ) || [];
  
  // Minimal ada 2 transfer (2 token masuk ke pool) + 1 LP token keluar
  const hasLPPattern = transferEvents.length >= 2;
  
  // LP Add jika memenuhi minimal 2 dari 3 heuristik
  const heuristicCount = [hasAddLPSelector, hasMintEvent, hasLPPattern].filter(Boolean).length;
  
  return heuristicCount >= 2;
}

/**
 * Deteksi apakah transaksi adalah Liquidity Remove (LP Remove).
 * 
 * Menggunakan 3 heuristik:
 * 1. Function selector untuk remove liquidity operations
 * 2. Burn event dalam logs (menandakan LP token dibakar)
 * 3. Pola transfer: user mengirim LP token, menerima 2+ token
 * 
 * @param tx - Data transaksi dengan input dan logs
 * @returns true jika terdeteksi sebagai LP Remove
 */
export function detectLPRemove(tx: SwapTransaction): boolean {
  if (!tx.to) return false;

  // Heuristik 1: Function selector untuk remove liquidity
  const hasRemoveLPSelector = tx.input && LP_FUNCTION_SELECTORS.has(tx.input.slice(0, 10).toLowerCase());
  
  // Heuristik 2: Ada Burn event (LP token dibakar)
  const hasBurnEvent = tx.logs?.some(log => 
    log.topics[0]?.toLowerCase() === BURN_EVENT_TOPIC.toLowerCase()
  ) || false;
  
  // Heuristik 3: Pola transfer - LP token masuk ke pool, multiple tokens keluar ke user
  const transferEvents = tx.logs?.filter(log => 
    log.topics[0]?.toLowerCase() === TRANSFER_EVENT_TOPIC.toLowerCase()
  ) || [];
  
  // Minimal ada 2+ transfer (LP token masuk + 2 token keluar)
  const hasLPPattern = transferEvents.length >= 2;
  
  // LP Remove jika memenuhi minimal 2 dari 3 heuristik
  const heuristicCount = [hasRemoveLPSelector, hasBurnEvent, hasLPPattern].filter(Boolean).length;
  
  return heuristicCount >= 2;
}

/**
 * Kategorisasi transaksi yang diperluas dengan deteksi swap dan LP.
 * 
 * @param tx - Data transaksi dengan informasi transfer dan swap
 * @param address - Alamat wallet untuk kategorisasi
 * @returns Kategori transaksi termasuk "swap", "lp_add", "lp_remove" jika terdeteksi
 */
export function categorizeTransactionExtended(
  tx: TransferEvent & Partial<SwapTransaction>,
  address: string,
): TransactionCategory {
  // Cek apakah ada data untuk deteksi lanjutan
  if (tx.to && (tx.input || tx.logs)) {
    const swapTx: SwapTransaction = {
      hash: tx.hash,
      to: tx.to,
      input: tx.input,
      logs: tx.logs,
    };
    
    // Prioritas deteksi: LP Add/Remove dulu, lalu Approve, kemudian Swap
    // Karena LP operations juga bisa mengandung swap patterns
    if (detectLPAdd(swapTx)) {
      return "lp_add";
    }
    
    if (detectLPRemove(swapTx)) {
      return "lp_remove";
    }
    
    if (detectApprove(swapTx)) {
      return "approve";
    }

    if (detectSwap(swapTx)) {
      return "swap";
    }

    // Komentar (ID): Jika punya input/logs tapi tidak cocok LP/Approve/Swap,
    // gunakan fallback 'contract_interaction' bila bukan send/receive.
    const base = categorizeTransaction(tx, address);
    if (base === "unknown") {
      return "contract_interaction";
    }
    return base;
  }
  
  // Fallback ke kategorisasi standar
  return categorizeTransaction(tx, address);
}
/**
 * Deteksi apakah transaksi adalah ERC-20 Approve.
 *
 * Menggunakan 2 heuristik utama:
 * 1. Function selector pada `tx.input` adalah `approve` (0x095ea7b3)
 * 2. Terdapat Approval event pada `tx.logs`
 *
 * Catatan: Approve umumnya ditujukan ke alamat kontrak token (bukan router),
 * namun kita tidak memvalidasi itu di sini untuk menjaga kompatibilitas lintas-chain.
 */
export function detectApprove(tx: SwapTransaction): boolean {
  if (!tx.to) return false;

  // Heuristik 1: Cek function selector
  const hasApproveSelector = tx.input && tx.input.length >= 10
    ? APPROVE_FUNCTION_SELECTORS.has(tx.input.slice(0, 10).toLowerCase())
    : false;

  // Heuristik 2: Cek Approval event di logs
  const hasApprovalEvent = tx.logs?.some(log =>
    log.topics.length > 0 && log.topics[0].toLowerCase() === APPROVAL_EVENT_TOPIC
  ) || false;

  return hasApproveSelector || hasApprovalEvent;
}

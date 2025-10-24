# DeFi Portfolio Dashboard - Project Rules

## 1. Code Quality & Linting

### Linting Process

- **WAJIB** jalankan `npm run lint` setelah setiap perubahan kode
- **Perbaiki SEMUA** issues yang muncul:
  - ❌ Errors
  - ⚠️ Warnings
  - 📝 Info/Hints
  - 🔧 Type errors
- **Tidak boleh** commit code yang masih ada linting issues

### Code Standards

- Follow [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- Gunakan `npm run format` (Prettier) untuk auto-formatting sebelum commit
- Strict TypeScript mode enabled (`strict: true`)
- No `any` types (use `unknown` if really needed)

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "warn",
    "prefer-const": "error"
  }
}
```

---

## 2. Testing

### Unit Testing Requirements

- **Setiap utility function** harus punya test
- **Hooks** harus di-test
- **Critical calculations** (portfolio value, PnL) wajib 100% coverage
- **WAJIB** jalankan `npm test` setelah setiap perubahan
- **Target**: Minimal 70% coverage (solo project)

### Testing Stack

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event happy-dom
```

### Test Examples

#### Utility Function Test

```typescript
// lib/utils/portfolio.test.ts
import { describe, it, expect } from "vitest";
import { calculatePortfolioValue, calculatePnL } from "./portfolio";

describe("Portfolio Utils", () => {
  describe("calculatePortfolioValue", () => {
    it("calculates total value correctly", () => {
      const holdings = [
        { symbol: "ETH", balance: 2, price: 2000 },
        { symbol: "USDC", balance: 1000, price: 1 },
      ];

      expect(calculatePortfolioValue(holdings)).toBe(5000);
    });

    it("handles empty portfolio", () => {
      expect(calculatePortfolioValue([])).toBe(0);
    });

    it("handles zero prices", () => {
      const holdings = [{ symbol: "TOKEN", balance: 100, price: 0 }];
      expect(calculatePortfolioValue(holdings)).toBe(0);
    });
  });

  describe("calculatePnL", () => {
    it("calculates profit correctly", () => {
      const currentValue = 5000;
      const initialValue = 4000;

      const result = calculatePnL(currentValue, initialValue);

      expect(result.amount).toBe(1000);
      expect(result.percentage).toBe(25);
    });

    it("calculates loss correctly", () => {
      const result = calculatePnL(3000, 4000);

      expect(result.amount).toBe(-1000);
      expect(result.percentage).toBe(-25);
    });
  });
});
```

#### Hook Test

```typescript
// hooks/usePortfolio.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { usePortfolio } from "./usePortfolio";

vi.mock("@/lib/api/alchemy", () => ({
  fetchTokenBalances: vi.fn(() =>
    Promise.resolve([
      { token: "0x...", balance: "1000000000000000000", symbol: "ETH" },
    ]),
  ),
}));

describe("usePortfolio", () => {
  it("fetches portfolio data successfully", async () => {
    const { result } = renderHook(() =>
      usePortfolio("0x1234567890123456789012345678901234567890"),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.tokens).toHaveLength(1);
  });

  it("handles errors gracefully", async () => {
    const { result } = renderHook(() => usePortfolio("invalid-address"));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

#### Component Test

```typescript
// components/PortfolioCard.test.tsx
import { render, screen } from "@testing-library/react";
import { PortfolioCard } from "./PortfolioCard";

describe("PortfolioCard", () => {
  const mockData = {
    totalValue: 5000,
    change24h: 250,
    changePercentage: 5.26,
  };

  it("renders portfolio value", () => {
    render(<PortfolioCard data={mockData} />);

    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
  });

  it("shows positive change in green", () => {
    render(<PortfolioCard data={mockData} />);

    const changeElement = screen.getByText(/5.26%/);
    expect(changeElement).toHaveClass("text-green-500");
  });

  it("shows negative change in red", () => {
    const negativeData = {
      ...mockData,
      change24h: -250,
      changePercentage: -5.26,
    };
    render(<PortfolioCard data={negativeData} />);

    const changeElement = screen.getByText(/-5.26%/);
    expect(changeElement).toHaveClass("text-red-500");
  });
});
```

### Test Checklist

- [ ] Test happy path
- [ ] Test edge cases (empty data, zero values)
- [ ] Test error handling (API failures, invalid addresses)
- [ ] Test loading states
- [ ] Test wallet connection/disconnection
- [ ] Mock external API calls (Alchemy, CoinGecko)
- [ ] Verify all tests pass before commit

---

## 3. Code Documentation

### Function Documentation

````typescript
/**
 * Formats a token balance with proper decimals and symbol.
 *
 * Converts raw token balance (in smallest unit) to human-readable format
 * with appropriate decimal places and currency symbol.
 *
 * @param balance - Raw balance as BigInt (e.g., 1000000000000000000 for 1 ETH)
 * @param decimals - Token decimal places (typically 18 for ERC-20)
 * @param symbol - Token symbol (e.g., 'ETH', 'USDC')
 * @returns Formatted balance string (e.g., "1.50 ETH")
 *
 * @example
 * ```ts
 * formatBalance(1500000000000000000n, 18, 'ETH')
 * // Returns: "1.50 ETH"
 * ```
 */
export function formatBalance(
  balance: bigint,
  decimals: number,
  symbol: string,
): string {
  const value = Number(balance) / Math.pow(10, decimals);
  return `${value.toFixed(2)} ${symbol}`;
}
````

### Hook Documentation

````typescript
/**
 * Hook to fetch and manage portfolio data for a wallet address.
 *
 * Fetches token balances, DeFi positions, and NFTs for the given address.
 * Automatically refetches data every 5 minutes and handles caching.
 *
 * @param address - Ethereum wallet address to track
 * @param options - Optional configuration
 * @param options.refetchInterval - Refetch interval in ms (default: 300000)
 * @param options.enabled - Whether to fetch data (default: true)
 *
 * @returns Portfolio data with loading and error states
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { data, isLoading, error } = usePortfolio('0x...');
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <PortfolioView data={data} />;
 * }
 * ```
 */
export function usePortfolio(address: string, options?: UsePortfolioOptions) {
  // Implementation
}
````

### Type Documentation

```typescript
/**
 * Represents a token holding in the portfolio.
 *
 * @interface TokenHolding
 * @property {string} address - Contract address of the token
 * @property {string} symbol - Token symbol (e.g., 'ETH', 'USDC')
 * @property {string} name - Full token name
 * @property {bigint} balance - Raw balance in smallest unit
 * @property {number} decimals - Token decimal places
 * @property {number} price - Current price in USD
 * @property {number} value - Total value in USD (balance * price)
 * @property {number} change24h - 24h price change percentage
 * @property {string} logo - URL to token logo image
 */
export interface TokenHolding {
  address: string;
  symbol: string;
  name: string;
  balance: bigint;
  decimals: number;
  price: number;
  value: number;
  change24h: number;
  logo: string;
}
```

### Complex Logic Comments

```typescript
// Calculate portfolio allocation by value
// Sort tokens by value descending to show largest holdings first
const sortedTokens = tokens.sort((a, b) => b.value - a.value);

// Group tokens under 1% into "Others" for cleaner chart
// This prevents cluttered pie charts with many small slices
const threshold = totalValue * 0.01;
const significantTokens = sortedTokens.filter((t) => t.value >= threshold);
const othersValue = sortedTokens
  .filter((t) => t.value < threshold)
  .reduce((sum, t) => sum + t.value, 0);

// Fetch historical prices for the past 90 days
// Use daily intervals to reduce API calls and data size
// Cache results for 1 hour to avoid rate limiting
const historicalPrices = await fetchPriceHistory(tokenAddress, {
  interval: "1d",
  days: 90,
});
```

---

## 4. Git Workflow

### Branching Strategy

- **Main branch**: `main` (production)
- **Development**: `dev` (integration)
- **Feature branch**: `feature/<nama-fitur>`
- **Bugfix branch**: `bugfix/<nama-bug>`
- **Hotfix branch**: `hotfix/<issue>`

**Contoh:**

- `feature/nft-tracking`
- `feature/yield-farming-display`
- `bugfix/price-calculation-error`
- `hotfix/api-rate-limit`

### Commit Guidelines

```
<type>(<scope>): <subject>

<body (optional)>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `perf`: Performance improvement
- `refactor`: Code refactoring
- `style`: UI/styling changes
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

**Scopes:**

- `portfolio`: Portfolio tracking
- `defi`: DeFi integrations
- `charts`: Chart components
- `alerts`: Alert system
- `ui`: UI components
- `api`: API calls
- `cache`: Caching logic

**Examples:**

```bash
git commit -m "feat(portfolio): add multi-wallet support"
git commit -m "fix(defi): resolve Aave position calculation"
git commit -m "perf(charts): optimize portfolio chart rendering"
git commit -m "refactor(api): simplify token price fetching"
```

### Commit Checklist

- [ ] Code formatted (`npm run format`)
- [ ] Linting passed (`npm run lint`)
- [ ] Tests passed (`npm test`)
- [ ] No console.log statements
- [ ] Documentation updated if needed
- [ ] Commit message follows convention

---

## 5. Documentation Management

### TODO.md Structure

```markdown
# PortGuard Dashboard - TODO

## This Week (Week 5) 🚧

### In Progress

- [ ] Implement Uniswap LP position tracking
- [ ] Add portfolio performance chart

### Up Next

- [ ] Integrate Curve pools
- [ ] Add NFT floor price tracking

## Backlog 📋

### High Priority

- [ ] Multi-chain support (Arbitrum, Polygon)
- [ ] Price alerts via email
- [ ] CSV export for tax reporting

### Medium Priority

- [ ] Dark mode
- [ ] Wallet labeling
- [ ] Transaction categorization

### Low Priority

- [ ] Social sharing
- [ ] Whale wallet following
- [ ] Portfolio comparison

## Completed ✅

### Week 4

- [x] Setup Alchemy integration
- [x] Fetch ERC-20 token balances
- [x] Display portfolio value chart
- [x] Add wallet connection

## Bugs 🐛

### Critical

- [ ] Portfolio value incorrect for tokens with >18 decimals

### Medium

- [ ] Chart tooltip doesn't show on mobile
- [ ] Price refresh doesn't update all tokens

### Low

- [ ] Loading spinner position off-center

## Performance 🚀

- [ ] Optimize token logo loading (use CDN)
- [ ] Add virtualization for large token lists
- [ ] Implement service worker for offline support

## Ideas 💡

- [ ] Add yield optimizer suggestions
- [ ] Implement cost basis tracking
- [ ] Add portfolio rebalancing calculator
- [ ] Create mobile app
```

### README.md Template

````markdown
# PortGuard Dashboard

> Track your DeFi portfolio across multiple chains with real-time analytics

## 👨‍💻 Developer

- **Name**: [Your Name]
- **GitHub**: [@yourusername](https://github.com/yourusername)
- **Twitter**: [@yourtwitter](https://twitter.com/yourtwitter)

## 📱 About

A comprehensive DeFi portfolio tracker that aggregates your positions across multiple protocols and chains. Get real-time insights, track P&L, and monitor your DeFi investments all in one place.

**Live Demo**: [https://defidash.app](https://defidash.app)

## ✨ Features

- ✅ Multi-wallet portfolio tracking
- ✅ Real-time token prices (CoinGecko)
- ✅ DeFi protocol integration (Aave, Uniswap)
- ✅ NFT tracking with floor prices
- ✅ Historical portfolio performance
- ✅ Price alerts
- 🚧 Multi-chain support (in progress)
- ⏳ Tax report generation (planned)

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Web3**: Wagmi, Viem, RainbowKit
- **State**: Zustand + TanStack Query
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/port-guard.git
cd port-guard

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```
````

## 🔑 Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# APIs
NEXT_PUBLIC_ALCHEMY_API_KEY=JOm3NMBVupM_IY2E8etYk
NEXT_PUBLIC_COINGECKO_API_KEY=CG-R58sW67cwVU1VeP2Gisqn3BK
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=3b2e592aaef7497d1a7c1b19629a2d21

# Database (optional for premium features)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## 📁 Project Structure

```
defi-dashboard/
├── app/                    # Next.js pages
│   ├── dashboard/          # Main dashboard
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── portfolio/          # Portfolio components
│   └── charts/             # Chart components
├── lib/
│   ├── hooks/              # Custom hooks
│   ├── api/                # API clients
│   └── utils/              # Utilities
└── types/                  # TypeScript types
```

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## 📊 Performance

- Lighthouse Score: 95+
- First Load JS: < 150KB
- Time to Interactive: < 2s
- API Response Time: < 500ms

## 🐛 Known Issues

- Token prices may be delayed up to 5 minutes (CoinGecko free tier)
- NFT floor prices update every 15 minutes
- Some tokens may not have logos available

## 📄 License

MIT License

---

**Status**: 🚧 Active Development (Week 5/16)  
**Current Focus**: DeFi protocol integrations  
**Next Milestone**: Multi-chain support (Week 8)

````

---

## 6. Performance Best Practices

### Data Fetching Optimization

```typescript
// ✅ Good - Batch API calls
const [balances, prices, defiPositions] = await Promise.all([
  fetchTokenBalances(address),
  fetchTokenPrices(tokenAddresses),
  fetchDefiPositions(address),
]);

// ✅ Good - Cache with appropriate TTL
const { data: portfolio } = useQuery({
  queryKey: ['portfolio', address],
  queryFn: () => fetchPortfolio(address),
  staleTime: 5 * 60 * 1000, // 5 minutes for portfolio data
  cacheTime: 30 * 60 * 1000, // Keep in cache for 30 min
});

// ✅ Good - Use Redis for expensive calculations
const cachedValue = await redis.get(`portfolio:${address}`);
if (cachedValue) return JSON.parse(cachedValue);

const value = await calculatePortfolioValue(address);
await redis.setex(`portfolio:${address}`, 300, JSON.stringify(value));
````

### Component Optimization

```typescript
// ✅ Good - Memoize expensive calculations
const portfolioStats = useMemo(() => {
  return {
    totalValue: calculateTotalValue(tokens),
    topPerformer: findTopPerformer(tokens),
    allocation: calculateAllocation(tokens),
  };
}, [tokens]);

// ✅ Good - Virtualize long lists
import { useVirtualizer } from "@tanstack/react-virtual";

function TokenList({ tokens }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tokens.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Token row height
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <TokenRow
            key={virtualRow.key}
            token={tokens[virtualRow.index]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ✅ Good - Lazy load images
<Image
  src={token.logo}
  alt={token.symbol}
  width={32}
  height={32}
  loading="lazy"
/>;
```

### Bundle Size Optimization

```typescript
// ✅ Good - Dynamic imports for heavy components
const PortfolioChart = dynamic(() => import("./PortfolioChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Don't need SSR for charts
});

// ✅ Good - Tree-shakeable imports
import { formatEther } from "viem";
import { useQuery } from "@tanstack/react-query";

// ❌ Bad - Import entire library
import * as viem from "viem";
import * as ReactQuery from "@tanstack/react-query";
```

---

## 7. Security Best Practices

### API Key Security

```typescript
// ✅ Good - Server-side API calls for sensitive keys
// app/api/portfolio/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  // API key only exists on server
  const response = await fetch(`https://api.coingecko.com/api/v3/...`, {
    headers: {
      "x-cg-pro-api-key": process.env.COINGECKO_API_KEY!, // Server-only
    },
  });

  return Response.json(await response.json());
}

// ❌ Bad - Exposing API key in client
const API_KEY = "cg-12345..."; // Never do this!
```

### Input Validation

```typescript
// ✅ Good - Validate wallet addresses
import { isAddress } from "viem";

function validateAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  return isAddress(address);
}

// Usage
if (!validateAddress(inputAddress)) {
  toast.error("Invalid Ethereum address");
  return;
}
```

### Rate Limiting

```typescript
// ✅ Good - Client-side rate limiting
import { rateLimit } from "@/lib/rateLimit";

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function GET(request: Request) {
  try {
    await limiter.check(10, "CACHE_TOKEN"); // 10 requests per minute
    // Process request
  } catch {
    return new Response("Rate limit exceeded", { status: 429 });
  }
}
```

---

## 8. Quick Reference

### Common Commands

```bash
# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm start                  # Start production server
npm run lint               # Run ESLint
npm run format             # Format with Prettier
npm test                   # Run tests

# Deployment
vercel                     # Deploy to Vercel
vercel --prod              # Deploy to production

# Database (if using)
npx prisma migrate dev     # Run migrations
npx prisma studio          # Open Prisma Studio
```

### Useful Utilities

```typescript
// Format large numbers
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format percentages
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

// Shorten address
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Calculate percentage change
export function calculateChange(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
```

---

## 9. Troubleshooting

### Common Issues

**Issue**: API rate limiting from CoinGecko

```typescript
// Solution: Implement request batching and caching
const priceCache = new Map<string, { price: number; timestamp: number }>();

async function getTokenPrice(address: string): Promise<number> {
  const cached = priceCache.get(address);
  const now = Date.now();

  // Use cache if less than 5 minutes old
  if (cached && now - cached.timestamp < 5 * 60 * 1000) {
    return cached.price;
  }

  const price = await fetchPriceFromAPI(address);
  priceCache.set(address, { price, timestamp: now });

  return price;
}
```

**Issue**: Slow portfolio calculation

```typescript
// Solution: Use Web Workers for heavy calculations
// workers/portfolio.worker.ts
self.addEventListener("message", async (e) => {
  const { tokens } = e.data;
  const totalValue = tokens.reduce((sum, t) => sum + t.value, 0);
  self.postMessage({ totalValue });
});

// Usage in component
const worker = new Worker(
  new URL("../workers/portfolio.worker", import.meta.url),
);

worker.postMessage({ tokens });
worker.onmessage = (e) => {
  setTotalValue(e.data.totalValue);
};
```

---

**📌 Note**: Karena ini solo project, prioritize MVP features dulu. Optimization dan advanced features bisa ditambahkan setelah launch!

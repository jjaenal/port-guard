# PortGuard Dashboard

> Comprehensive DeFi portfolio tracker with real-time analytics, multi-chain support, and advanced insights for crypto investors and traders.

## 🎯 Project Overview

A powerful dashboard that aggregates DeFi positions across multiple chains, tracks portfolio performance, monitors yields, and provides actionable insights for crypto investors. Built for both retail users and power users (whales, DAOs, funds).

## 🌟 Core Features

### 1. **Portfolio Tracking**

- Multi-wallet support (track unlimited wallets)
- Real-time portfolio valuation
- Native token balances (ETH, MATIC) with USD conversion
- ERC-20 token balances across all chains
- NFT gallery & floor price tracking
- Historical portfolio performance
- Profit/Loss (PnL) calculation
- Cost basis tracking
- Asset allocation breakdown

### 2. **DeFi Protocol Integration**

- Lending positions (Aave, Compound, Maker)
- Liquidity pools (Uniswap, Curve, Balancer)
- Staking positions (Lido, Rocket Pool)
- Yield farming tracking
- Borrowed amounts & health factors
- Claimable rewards tracker
- LP token value calculation
- Impermanent loss calculator

### 3. **Multi-Chain Support**

- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base
- Avalanche
- BNB Chain
- Unified view across all chains
- Cross-chain asset tracking

### 4. **Advanced Analytics**

- Portfolio performance charts (1D, 1W, 1M, 1Y, All)
- Token performance comparison
- Yield/APY tracking over time
- Risk metrics & exposure analysis
- Transaction history & categorization
- Gas spending analytics
- Tax report generation (CSV export)
- Whale wallet tracking

### 5. **Price Alerts & Notifications**

- Token price alerts
- Portfolio value milestones
- Liquidation warnings (health factor < 1.2)
- Large transaction alerts
- Yield opportunity notifications
- Email & browser notifications
- Discord/Telegram webhooks

### 6. **Smart Insights**

- Best performing assets
- Worst performing assets
- Yield optimization suggestions
- Risk assessment (high/medium/low)
- Diversification score
- Token correlation analysis
- Market sentiment indicators
- AI-powered insights (optional Phase 2)

### 7. **Social Features**

- Public portfolio sharing
- Leaderboards (Top performers)
- Follow whale wallets
- Community strategies
- Portfolio comparisons
- Social trading signals (optional)

### 8. **Developer Features**

- Public API for data access
- Webhook notifications
- Portfolio snapshots API
- Historical data exports
- Custom dashboard widgets

## 🏗️ Technical Architecture

### **Frontend Stack**

```
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui
- State: Zustand + TanStack Query
- Web3: Wagmi v2 + Viem
- Charts: Recharts + TradingView widgets
- Animations: Framer Motion
- Tables: TanStack Table
```

### **Backend Services**

```
- Runtime: Node.js 20+
- Framework: Express.js / Fastify
- Database: PostgreSQL (main data)
- Time-series: TimescaleDB (price history)
- Cache: Redis (hot data, rates)
- Queue: Bull MQ (data fetching jobs)
- Search: Algolia (token search)
```

### **Data Sources**

```
- Blockchain RPCs: Alchemy, QuickNode
- Price Data: CoinGecko, CoinMarketCap
- DeFi Protocols: The Graph (subgraphs)
- Token Lists: Uniswap, CoinGecko
- Gas Prices: EthGasStation, Blocknative
- NFT Data: OpenSea, Reservoir
- Historical: Dune Analytics (optional)
```

### **Infrastructure**

```
- Hosting: Vercel (Frontend)
- Backend: Railway / Fly.io
- Database: Supabase / Railway
- Cache: Upstash Redis
- Storage: AWS S3 (exports)
- CDN: Cloudflare
- Monitoring: Sentry + Vercel Analytics
```

## 📊 Database Schema

### Core Tables

```sql
-- Users & Authentication
users (id, email, wallet_addresses, created_at)
sessions (id, user_id, token, expires_at)
api_keys (id, user_id, key, permissions)

-- Wallets & Tracking
wallets (id, user_id, address, label, chain_id, is_primary)
watchlist_wallets (id, user_id, address, label, is_public)

-- Portfolio Data (cached)
portfolio_snapshots (id, wallet_id, timestamp, total_value_usd)
token_balances (id, wallet_id, token_address, balance, value_usd, chain_id)
nft_holdings (id, wallet_id, contract_address, token_id, floor_price)
defi_positions (id, wallet_id, protocol, position_type, value_usd, details)

-- Historical Data
price_history (timestamp, token_address, price_usd, chain_id)
portfolio_history (timestamp, wallet_id, total_value_usd)
transaction_history (id, wallet_id, hash, type, value, timestamp)

-- Alerts & Notifications
alerts (id, user_id, type, conditions, enabled)
notifications (id, user_id, alert_id, message, read, created_at)

-- Premium Features
subscriptions (id, user_id, plan, status, expires_at)
```

## 🔐 Security Requirements

- ✅ Read-only wallet connections (no private keys)
- ✅ API key authentication with rate limiting
- ✅ CORS configuration
- ✅ Input validation & sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Rate limiting on all endpoints
- ✅ Secure session management
- ✅ HTTPS only
- ✅ Privacy mode (hide balances)

## 💰 Monetization Strategy

### Freemium Model

**Free Tier**

- Track 3 wallets
- Basic portfolio view
- 7 days history
- Standard refresh (5 min)
- Basic alerts (5 active)
- Community support

**Pro ($9.99/month)**

- Track 20 wallets
- Advanced analytics
- 90 days history
- Fast refresh (1 min)
- Unlimited alerts
- NFT tracking
- Export reports (CSV)
- Email support
- API access (1k calls/day)

**Premium ($29.99/month)**

- Unlimited wallets
- Full history (1 year+)
- Real-time updates
- Advanced insights
- Tax reports
- Priority support
- White-label widget
- API access (10k calls/day)
- Discord/Telegram alerts
- Whale tracking

**Enterprise (Custom)**

- Everything Premium
- Custom integrations
- Dedicated support
- SLA guarantee
- White-label dashboard
- Custom features
- Team accounts
- API unlimited

### Additional Revenue

- Affiliate commissions (DEX aggregators, protocols)
- Premium API access ($99-999/month)
- Tax report service ($49-199 per report)
- Sponsored protocol listings ($500-2k/month)
- White-label licensing ($5k-20k setup)
- Data licensing to institutions

### Revenue Projections (Conservative)

```
Month 3: $500-1k (100 Pro users)
Month 6: $3k-5k (300 Pro, 50 Premium)
Month 9: $8k-12k (600 Pro, 100 Premium)
Month 12: $15k-25k (1000 Pro, 200 Premium, 10 Enterprise)
Year 2: $50k-100k/month (Scale + Enterprise)
```

## 🎨 Design Principles

### UI/UX

- Dark mode first (Crypto native)
- Clean, minimal design
- Fast, responsive interactions
- Mobile-first approach
- Data-dense but readable
- Color-coded gains/losses
- Intuitive navigation
- Progressive disclosure

### Color Scheme

- Background: #0A0E1A (Dark blue-black)
- Cards: #111827 (Gray-900)
- Accent: #3B82F6 (Blue)
- Success: #10B981 (Green)
- Loss: #EF4444 (Red)
- Warning: #F59E0B (Amber)

### Typography

- Headers: Clash Display / Satoshi
- Body: Inter
- Numbers: JetBrains Mono

## 🔗 Key Integrations

### Must-Have (Phase 1)

- Alchemy / QuickNode (RPC)(jajang.developer@gmail.com)
- CoinGecko API (prices)(jajang.developer@gmail.com)
- The Graph (DeFi data)
- Uniswap Token Lists
- WalletConnect
- ENS resolution

### Nice-to-Have (Phase 2)

- 0x API (token swaps)
- OpenSea API (NFTs)
- Zapper / DeBank API
- DeFi Llama API
- Dune Analytics
- Discord/Telegram bots

## 📱 User Personas

### 1. **Retail DeFi User** (Primary)

- $5k-100k portfolio
- 2-5 wallets
- Active in 3-5 protocols
- Checks daily
- Needs: Simple tracking, alerts, insights

### 2. **Power User** (Secondary)

- $100k-1M portfolio
- 5-20 wallets
- Active across many chains
- Checks multiple times daily
- Needs: Advanced analytics, tax reports, API

### 3. **Whale/Fund** (Enterprise)

- $1M+ portfolio
- 20+ wallets
- Complex DeFi positions
- Professional usage
- Needs: Custom features, white-label, support

## 🗺️ Product Roadmap

### Phase 1: MVP (Months 1-3)

- Wallet connection & tracking
- Token balances (Ethereum + Polygon)
- Basic DeFi positions (Aave, Uniswap)
- Portfolio value chart
- Simple P&L
- Price alerts
- Launch landing page

### Phase 2: Growth (Months 4-6)

- Multi-chain expansion (5+ chains)
- NFT tracking
- Advanced analytics
- Historical data (90 days)
- Tax export
- Mobile responsive
- API v1 launch

### Phase 3: Scale (Months 7-12)

- Real-time updates
- Whale tracking
- Social features
- Advanced insights
- Team accounts
- White-label widget
- Mobile app (optional)

### Phase 4: Optimize (Year 2)

- AI-powered insights
- Automated yield optimization
- Portfolio rebalancing suggestions
- Social trading
- Additional protocol integrations
- International expansion

## 📈 Success Metrics (KPIs)

### Product Metrics

- Daily active users (DAU)
- Wallets tracked
- Total portfolio value managed
- User retention (7-day, 30-day)
- Feature adoption rate
- Session duration
- API usage

### Business Metrics

- Monthly Recurring Revenue (MRR)
- Conversion rate (Free → Pro)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- Net Promoter Score (NPS)

### Technical Metrics

- Page load time (<2s)
- Time to interactive (<3s)
- API response time (<500ms)
- Data freshness (<5min)
- Uptime (99.9%+)
- Error rate (<0.1%)

## 🧪 Testing Strategy

### Unit Tests

- Component tests (React Testing Library)
- Hook tests
- Utility function tests
- 80%+ coverage

### Integration Tests

- API endpoint tests
- Database queries
- External API mocks
- Wallet connection flow

### E2E Tests

- User sign up flow
- Wallet connection
- Portfolio viewing
- Alert creation
- Subscription upgrade

## 🔔 Alerts Behavior

### Portfolio Value Milestones (Crossing)

- Alert tipe `portfolio` hanya akan trigger saat nilai portofolio MENYEBERANGI ambang (`above`/`below`), bukan sekadar berada di atas/bawah.
- Implementasi menggunakan dua snapshot: yang terbaru dan yang sebelumnya, untuk mendeteksi crossing dari sisi berlawanan.
- Notifikasi menggunakan format pesan yang jelas: `Portfolio value crossed above/below $X (current $Y)`.

### Price Alerts

- Alert tipe `price` mendukung operator: `above`, `below`, `percent_increase`, `percent_decrease` (logika persentase disederhanakan pada tahap awal).

### Cooldown (Anti-Spam)

- Semua alert (price & portfolio) menggunakan cooldown untuk mencegah retrigger yang terlalu sering.
- Default cooldown: `10 menit`.
- Konfigurasi via environment variable: `ALERT_COOLDOWN_MINUTES`.
- Perilaku: ketika `lastTriggered` masih dalam jangka waktu cooldown, alert akan di-skip dan tidak membuat notifikasi/email.

### UI

- Pembuatan alert untuk tipe `Portfolio` hanya menampilkan operator `Above` dan `Below` untuk menegaskan konsep milestone.
- Tipe `Token Price` menampilkan operator lengkap termasuk persen naik/turun.

### Cron Processing

- Endpoint cron (`/api/cron/alerts`) memanggil `processAlerts` setelah verifikasi kunci API.
- Proses akan:
  - Mengelompokkan alert price per token untuk mengurangi panggilan API harga.
  - Mengevaluasi kondisi dan menerapkan cooldown sebelum membuat notifikasi dan email.
  - Mengambil snapshot portofolio dan mendeteksi crossing threshold untuk alert `portfolio`.

#### Cron Configuration

**API Key Authentication**
- Endpoint: `GET /api/cron/alerts`
- Mendukung 3 metode autentikasi:
  - Query parameter: `?apiKey=your_key`
  - Header `x-api-key`: `your_key`
  - Header `Authorization`: `Bearer your_key`
- Environment variable: `ALERTS_CRON_API_KEY`

**Provider Setup Examples**

*Vercel Cron (vercel.json):*
```json
{
  "crons": [
    {
      "path": "/api/cron/alerts?apiKey=your_secure_key",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

*GitHub Actions (.github/workflows/cron.yml):*
```yaml
name: Alert Processing
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  process-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Alert Processing
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/alerts" \
            -H "x-api-key: ${{ secrets.ALERTS_CRON_API_KEY }}"
```

*Cloudflare Workers (wrangler.toml):*
```toml
[triggers]
crons = ["*/5 * * * *"]

[env.production.vars]
ALERTS_CRON_API_KEY = "your_secure_key"
```

**Recommended Schedule**
- Interval: Setiap 5 menit (`*/5 * * * *`)
- Alasan: Balance antara responsivitas dan efisiensi API calls
- Untuk testing: Setiap 1 menit (`* * * * *`)

## 🚀 Go-to-Market Strategy

### Pre-Launch (Weeks 1-2)

- Build landing page with waitlist
- Create social media accounts
- Post in crypto communities
- Collect 500+ waitlist signups

### Launch (Week 3)

- Product Hunt launch
- Twitter announcement
- Reddit posts (r/defi, r/ethereum)
- Crypto Discord servers
- Reach out to crypto influencers
- Target: 1,000 users Month 1

### Growth (Months 2-6)

- Content marketing (SEO)
- Comparison pages (vs competitors)
- Feature blog posts
- Twitter engagement
- Referral program
- Partnership with protocols
- Target: 10,000 users Month 6

## 🔧 Development Best Practices

- Mobile-first responsive design
- Code splitting for performance
- Lazy loading components
- Image optimization (Next.js Image)
- API response caching (Redis)
- Error boundary implementation
- Accessibility (WCAG 2.1 AA)
- SEO optimization
- Progressive Web App (PWA)

## 📚 Documentation Needs

- User guide
- API documentation
- Integration guides
- FAQ
- Troubleshooting
- Video tutorials
- Blog/changelog

## 🌍 Competitive Landscape

### Main Competitors

- Zapper
- DeBank
- Zerion
- Rotki

### Competitive Advantages

- Better UX & performance
- More detailed analytics
- Advanced alerts
- Affordable pricing
- Developer-friendly API
- Open to feedback/features

## ⚠️ Risks & Mitigation

### Technical Risks

- RPC rate limits → Multiple providers + caching
- Data accuracy → Multiple data sources
- Performance → Optimization + caching
- Third-party API downtime → Fallbacks

### Business Risks

- Competition → Unique features + UX
- User acquisition → Marketing + SEO
- Monetization → Test pricing early
- Crypto market downturn → Focus on retention

## 📄 License

MIT License (keep it open to attract community)

---

**Perfect for:** Solo developer, bootstrapped, 3-4 months to launch  
**Initial Investment:** $500-2k (hosting, APIs, domain)  
**Revenue Potential:** $5k-50k/month within 12 months

## 🔑 Environment Variables

```env
# Notifications (server-side)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=alerts@portguard.app
```

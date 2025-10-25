import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-20">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          PortGuard
          <span className="text-primary"> Dashboard</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Track your DeFi portfolio across multiple chains with real-time
          analytics, yield farming insights, and comprehensive position
          management.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Powerful Features for DeFi Investors
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Chain Support</CardTitle>
              <CardDescription>
                Track assets across Ethereum, Polygon, Arbitrum, Optimism, and
                more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Comprehensive portfolio view with real-time data from multiple
                blockchain networks.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DeFi Protocol Integration</CardTitle>
              <CardDescription>
                Monitor positions in Aave, Uniswap, Compound, and other
                protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatic detection and tracking of your DeFi positions with
                yield calculations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time Analytics</CardTitle>
              <CardDescription>
                Advanced charts, P&L tracking, and performance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Beautiful visualizations and detailed analytics to optimize your
                DeFi strategy.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about tracking your DeFi portfolio with
            PortGuard.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                What chains does PortGuard support?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                PortGuard currently supports Ethereum and Polygon networks.
                We're actively working on adding Arbitrum, Optimism, and Base
                support. Our multi-chain architecture allows us to quickly
                integrate new networks based on user demand.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                How secure is my wallet data?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                PortGuard is completely non-custodial. We only read public
                blockchain data using your wallet address - we never store
                private keys or have access to your funds. All data is fetched
                directly from blockchain networks and reputable APIs like
                Alchemy and CoinGecko.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Which DeFi protocols are supported?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We support major DeFi protocols including Uniswap V2/V3, Aave,
                Compound, Curve, and many others. Our system automatically
                detects your positions across these protocols and calculates
                yields, impermanent loss, and other important metrics.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                How often is portfolio data updated?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Portfolio balances and prices are updated in real-time when you
                visit the dashboard. Historical data is cached for performance,
                with token prices updated every 5 minutes and DeFi positions
                refreshed every 15 minutes during active trading hours.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Can I track multiple wallets?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! Free users can track up to 3 wallets, while Pro users have
                unlimited wallet tracking. You can easily switch between wallets
                or view an aggregated portfolio across all your addresses.
                Perfect for managing multiple strategies or DeFi positions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Do you provide tax reporting features?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Pro users get access to comprehensive tax reporting tools
                including CSV exports, cost basis tracking, and transaction
                categorization. We're working on direct integrations with
                popular tax software to make DeFi tax reporting as simple as
                possible.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                What makes PortGuard different from other portfolio trackers?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                PortGuard focuses specifically on DeFi with deep protocol
                integrations, real-time yield tracking, and advanced analytics.
                Unlike generic portfolio trackers, we understand DeFi mechanics
                like impermanent loss, liquidity mining rewards, and complex
                position structures across multiple protocols.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-20 bg-muted/50 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Take Control of Your DeFi Portfolio?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Connect your wallet and start tracking your investments today.
        </p>
        <Button asChild size="lg">
          <Link href="/dashboard">Launch Dashboard</Link>
        </Button>
      </section>
    </div>
  );
}

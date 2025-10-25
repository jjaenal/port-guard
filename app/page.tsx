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

      {/* Pricing Section */}
      <section className="py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade as your portfolio grows. All plans include
            core tracking features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-xl">Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="text-3xl font-bold">
                $0
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Track up to 3 wallets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Basic portfolio analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Ethereum & Polygon support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Real-time token prices
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Basic DeFi position tracking
                </li>
              </ul>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/dashboard">Get Started Free</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <CardHeader>
              <CardTitle className="text-xl">Pro</CardTitle>
              <CardDescription>For serious DeFi investors</CardDescription>
              <div className="text-3xl font-bold">
                $19
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Unlimited wallets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Advanced analytics & insights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  All supported chains
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Price alerts & notifications
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Historical data & reports
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Tax reporting tools
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Priority support
                </li>
              </ul>
              <Button className="w-full" asChild>
                <Link href="/dashboard">Start Pro Trial</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-xl">Enterprise</CardTitle>
              <CardDescription>For institutions & teams</CardDescription>
              <div className="text-3xl font-bold">
                Custom
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  pricing
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Team collaboration tools
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Custom integrations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  API access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  White-label solutions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Dedicated support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  SLA guarantees
                </li>
              </ul>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
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

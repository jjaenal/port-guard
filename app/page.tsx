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

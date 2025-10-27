"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Coins, Calendar, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentSigned } from "@/lib/utils";
import { isAddress } from "viem";
import { StakingSummaryRow } from "@/components/ui/staking-summary-row";
import { RewardStat } from "@/components/ui/reward-stat";

export const dynamic = "force-dynamic";

export default function RocketPoolPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </div>
      }
    >
      <RocketPoolContent />
    </Suspense>
  );
}

function RocketPoolContent() {
  const params = useSearchParams();
  const { address, isConnected } = useAccount();
  const targetAddress = params.get("address") || address;
  const isValidEthereumAddress = targetAddress
    ? isAddress(targetAddress)
    : false;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["defi-rocket-pool-reth", targetAddress],
    queryFn: async () => {
      if (!targetAddress) throw new Error("No address provided");
      const res = await fetch(`/api/defi/rocket-pool?address=${targetAddress}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    enabled: !!targetAddress && isValidEthereumAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  if (!isConnected && !targetAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                src="https://assets.coingecko.com/coins/images/20764/small/reth.png"
                alt="Rocket Pool"
                width={32}
                height={32}
                className="rounded-full"
              />
              Rocket Pool rETH Position
            </CardTitle>
            <CardDescription>
              View your Rocket Pool staking position and rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>Connect Wallet</AlertTitle>
              <AlertDescription>
                Please connect your wallet to view your Rocket Pool rETH
                position.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardAction>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardAction>
        </Card>
      </div>
    );
  }

  if (!isValidEthereumAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                src="https://assets.coingecko.com/coins/images/20764/small/reth.png"
                alt="Rocket Pool"
                width={32}
                height={32}
                className="rounded-full"
              />
              Rocket Pool rETH Position
            </CardTitle>
            <CardDescription>Invalid Ethereum address</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>Invalid Address</AlertTitle>
              <AlertDescription>
                The provided address is not a valid Ethereum address.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardAction>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardAction>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                src="https://assets.coingecko.com/coins/images/20764/small/reth.png"
                alt="Rocket Pool"
                width={32}
                height={32}
                className="rounded-full"
              />
              Rocket Pool rETH Position
            </CardTitle>
            <CardDescription>Loading your staking position...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="animate-pulse h-16 bg-muted rounded" />
              <div className="animate-pulse h-16 bg-muted rounded" />
              <div className="animate-pulse h-16 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                src="https://assets.coingecko.com/coins/images/20764/small/reth.png"
                alt="Rocket Pool"
                width={32}
                height={32}
                className="rounded-full"
              />
              Rocket Pool rETH Position
            </CardTitle>
            <CardDescription>Error loading position data</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : "Unknown error occurred"}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardAction className="flex gap-2">
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Try Again"}
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardAction>
        </Card>
      </div>
    );
  }

  const balance = parseFloat(data?.balance || "0");
  const hasPosition = balance > 0;

  if (!hasPosition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                src="https://assets.coingecko.com/coins/images/20764/small/reth.png"
                alt="Rocket Pool"
                width={32}
                height={32}
                className="rounded-full"
              />
              Rocket Pool rETH Position
            </CardTitle>
            <CardDescription>
              No rETH position found for {targetAddress?.slice(0, 6)}...
              {targetAddress?.slice(-4)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>No Position Found</AlertTitle>
              <AlertDescription>
                This address does not hold any rETH tokens. Start staking ETH on
                Rocket Pool to earn rewards.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardAction className="flex gap-2">
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardAction>
        </Card>
      </div>
    );
  }

  const priceUsd = data?.priceUsd || 0;
  const valueUsd = data?.valueUsd || 0;
  const apr = data?.apr || 0;
  const dailyRewardsEth = (balance * (apr / 100)) / 365;
  const monthlyRewardsEth = dailyRewardsEth * 30;
  const dailyRewardsUsd = dailyRewardsEth * priceUsd;
  const monthlyRewardsUsd = monthlyRewardsEth * priceUsd;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image
              src="https://assets.coingecko.com/coins/images/20764/small/reth.png"
              alt="Rocket Pool"
              width={32}
              height={32}
              className="rounded-full"
            />
            Rocket Pool rETH Position
          </CardTitle>
          <CardDescription>
            Staking position for {targetAddress?.slice(0, 6)}...
            {targetAddress?.slice(-4)}
          </CardDescription>
        </CardHeader>
        <CardAction>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </CardAction>
      </Card>

      {/* Position Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Position Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StakingSummaryRow
            icon={
              <Image
                src="https://assets.coingecko.com/coins/images/20764/small/reth.png"
                alt="rETH"
                width={20}
                height={20}
                className="rounded-full"
              />
            }
            label="Token"
            value="rETH (Rocket Pool ETH)"
          />
          <StakingSummaryRow
            icon={<Coins className="h-4 w-4" />}
            label="Balance"
            value={`${balance.toFixed(6)} rETH`}
          />
          <StakingSummaryRow
            icon={<TrendingUp className="h-4 w-4" />}
            label="Current Price"
            value={formatCurrency(priceUsd)}
          />
          <StakingSummaryRow
            icon={<Percent className="h-4 w-4" />}
            label="APR"
            value={`${apr.toFixed(2)}%`}
          />
        </CardContent>
      </Card>

      {/* Rewards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RewardStat
          title="Daily Rewards"
          value={formatCurrency(dailyRewardsUsd)}
          subtitle={`${dailyRewardsEth.toFixed(6)} ETH`}
          icon={<Calendar className="h-4 w-4" />}
        />
        <RewardStat
          title="Monthly Rewards"
          value={formatCurrency(monthlyRewardsUsd)}
          subtitle={`${monthlyRewardsEth.toFixed(6)} ETH`}
          icon={<Calendar className="h-4 w-4" />}
        />
      </div>

      {/* Total Value */}
      <Card>
        <CardHeader>
          <CardTitle>Total Position Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(valueUsd)}
          </div>
          <p className="text-muted-foreground mt-1">
            {balance.toFixed(6)} rETH × {formatCurrency(priceUsd)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

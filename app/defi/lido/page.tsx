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

export default function LidoPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </div>
      }
    >
      <LidoContent />
    </Suspense>
  );
}

function LidoContent() {
  const params = useSearchParams();
  const { address, isConnected } = useAccount();
  const targetAddress = params.get("address") || address;
  const isValidEthereumAddress = targetAddress
    ? isAddress(targetAddress)
    : false;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["defi-lido-steth", targetAddress],
    queryFn: async () => {
      if (!targetAddress || !isValidEthereumAddress) {
        throw new Error("Invalid Ethereum address");
      }
      const res = await fetch(`/api/defi/lido?address=${targetAddress}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error?.message || `Lido API failed: ${res.status}`,
        );
      }
      const json = await res.json();
      return json.data || null;
    },
    enabled: !!targetAddress,
    staleTime: 60_000,
  });

  if (!isConnected && !params.get("address")) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view Lido stETH position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (targetAddress && !isValidEthereumAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Address</CardTitle>
            <CardDescription>
              The provided address is not a valid Ethereum address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Address Error</AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  The address{" "}
                  <code className="bg-muted-foreground/20 px-1 rounded">
                    {targetAddress}
                  </code>{" "}
                  is not a valid Ethereum address.
                </p>
                <p>
                  Lido data only available for valid addresses starting with 0x.
                </p>
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link href="/dashboard">
                <Button>Return to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            <span className="inline-flex items-center gap-2">
              <Image
                src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg?v=029"
                alt="Lido"
                width={28}
                height={28}
                priority={false}
              />
              <span>Lido stETH Position</span>
            </span>
          </h1>
          <p className="text-muted-foreground">
            Summary of stETH balance, value, and APR
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6 bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-background">
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Image
                src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg?v=029"
                alt="Lido"
                width={20}
                height={20}
                loading="lazy"
              />
              <span>Summary</span>
            </span>
          </CardTitle>
          <CardDescription>Your stETH overview</CardDescription>
          <CardAction>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-6 w-64 bg-muted rounded" />
              <div className="h-6 w-64 bg-muted rounded" />
            </div>
          ) : isError ? (
            <Alert
              variant="destructive"
              closable
              autoHide
              autoHideDuration={15000}
            >
              <AlertTitle>Unable to load Lido data</AlertTitle>
              <AlertDescription>
                {(() => {
                  const msg = (error as Error)?.message || "";
                  if (/fetch|network/i.test(msg))
                    return "Network issue. Check your connection and retry.";
                  if (/429|rate limit/i.test(msg))
                    return "Rate limit exceeded. Please wait before refreshing.";
                  if (/500|server/i.test(msg))
                    return "Service temporarily unavailable. Try again later.";
                  if (/invalid ethereum address/i.test(msg))
                    return "Invalid Ethereum address format.";
                  return msg || "Unable to load data. Please try again.";
                })()}
              </AlertDescription>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? "Retrying..." : "Retry"}
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <StakingSummaryRow 
                  label="Token"
                  icon={<Image
                    src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg?v=029"
                    alt="Lido"
                    width={16}
                    height={16}
                    loading="lazy"
                  />}
                  value={
                    <div>
                      <span className="font-medium">{data?.token?.symbol || "stETH"}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {data?.token?.name || "Lido Staked Ether"}
                      </span>
                    </div>
                  }
                />
                
                <StakingSummaryRow 
                  label="Estimated Value"
                  icon={<Coins className="h-4 w-4" />}
                  value={formatCurrency(data?.valueUsd || 0)}
                />
                
                <StakingSummaryRow 
                  label="Balance"
                  value={`${Number(data?.balance || 0).toFixed(6)} stETH`}
                />
                
                <StakingSummaryRow 
                  label="Price"
                  value={typeof data?.priceUsd === "number" ? formatCurrency(data.priceUsd) : "-"}
                />
                
                <StakingSummaryRow 
                  label="APR"
                  icon={<Percent className="h-4 w-4" />}
                  value={formatPercentSigned(data?.apr || 0)}
                  valueClassName={data?.apr > 0 ? "text-green-500" : ""}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <RewardStat
                  title="Daily Rewards"
                  value={formatCurrency(data?.estimatedDailyRewardsUsd || 0)}
                  subtitle="Estimated based on current APR"
                  icon={<Calendar className="h-5 w-5" />}
                />
                
                <RewardStat
                  title="Monthly Rewards"
                  value={typeof data?.estimatedDailyRewardsUsd === "number"
                    ? formatCurrency((data.estimatedDailyRewardsUsd || 0) * 30)
                    : "-"}
                  subtitle="Projected over 30 days"
                  icon={<Calendar className="h-5 w-5" />}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Context</CardTitle>
          <CardDescription>Request details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-mono break-all">{targetAddress || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data Source</p>
              <p>API: /api/defi/lido</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

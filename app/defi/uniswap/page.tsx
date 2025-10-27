"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentSigned } from "@/lib/utils";
import type { UniswapPosition } from "@/lib/defi/uniswap";
import { isAddress } from "viem";

export const dynamic = "force-dynamic";

export default function UniswapDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </div>
      }
    >
      <UniswapDetailContent />
    </Suspense>
  );
}

function UniswapDetailContent() {
  const params = useSearchParams();
  const { address, isConnected } = useAccount();
  const targetAddress = params.get("address") || address;
  const isValidEthereumAddress = targetAddress
    ? isAddress(targetAddress)
    : false;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["defi-uniswap-detail", targetAddress],
    queryFn: async () => {
      if (!targetAddress || !isValidEthereumAddress) {
        throw new Error("Invalid Ethereum address");
      }
      const res = await fetch(`/api/defi/uniswap?address=${targetAddress}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Uniswap API failed: ${res.status}`);
      }
      const json = await res.json();
      return json.data || { positions: [], totalUsd: 0, avgApr7d: 0 };
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
              Please connect your wallet to view Uniswap positions
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
                  Uniswap positions are only available for Ethereum addresses
                  starting with &quot;0x&quot;.
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
          {/* Edited: Add Uniswap logo in page header */}
          <h1 className="text-3xl font-bold mb-1">
            <span className="inline-flex items-center gap-2">
              <img
                src="https://cryptologos.cc/logos/uniswap-uni-logo.svg?v=029"
                alt="Uniswap"
                className="h-7 w-7"
              />
              <span>Uniswap v3 Positions</span>
            </span>
          </h1>
          <p className="text-muted-foreground">
            Detailed view for your LP positions
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-background">
        <CardHeader>
          {/* Edited: Add Uniswap logo in summary card header */}
          <CardTitle>
            <span className="flex items-center gap-2">
              <img
                src="https://cryptologos.cc/logos/uniswap-uni-logo.svg?v=029"
                alt="Uniswap"
                className="h-5 w-5"
              />
              <span>Summary</span>
            </span>
          </CardTitle>
          <CardDescription>Your Uniswap LP overview</CardDescription>
          <CardAction>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <AlertTitle>Unable to load positions</AlertTitle>
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
                    return "Invalid Ethereum address format. Please use a valid address.";
                  return msg || "Unable to load positions. Please try again.";
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Positions</p>
                <p className="font-medium">{data?.positions?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Estimated Total Value
                </p>
                <p className="font-medium">
                  {formatCurrency(data?.totalUsd ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg APR (7d)</p>
                <p className="font-medium">
                  {formatPercentSigned(data?.avgApr7d ?? 0)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && !isError && data?.positions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Positions</CardTitle>
            <CardDescription>
              Pool, tokens, estimated value, and APR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.positions.map((p: UniswapPosition) => (
                <div
                  key={`${p.chain}-${p.id}`}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {p.token0.symbol}/{p.token1.symbol}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.chain}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pool: {p.poolAddress}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {formatCurrency(p.estimatedUsd || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      APR 7d: {formatPercentSigned(p.apr7d || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

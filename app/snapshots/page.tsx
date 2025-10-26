"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { useSnapshotHistory } from "@/lib/hooks/useSnapshotHistory";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function SnapshotsPage() {
  const { address, isConnected } = useAccount();
  const [page, setPage] = useState(0);
  const limit = 10;
  const {
    data: snapshotHistory,
    isLoading,
    error,
    refetch,
  } = useSnapshotHistory(address, limit, page);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Snapshot History
          </h1>
          <p className="text-muted-foreground">
            Recent snapshots for your wallet
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/snapshots/compare">
            <Button>Compare Snapshots</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Please connect your wallet to view snapshots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Open the dashboard and connect your wallet first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {error && (
            <div className="mb-4">
              <Alert variant="destructive" closable>
                <AlertTitle>Failed to load snapshots</AlertTitle>
                <AlertDescription>
                  {(() => {
                    const errorMessage =
                      error instanceof Error ? error.message : "";
                    if (errorMessage.includes("Snapshots API error:")) {
                      const match = errorMessage.match(/\d+\s+(.+)$/);
                      if (match) {
                        try {
                          const errorBody = JSON.parse(match[1]);
                          return (
                            errorBody.error ||
                            errorBody.message ||
                            "Unknown API error"
                          );
                        } catch {
                          return match[1] || "API request failed";
                        }
                      }
                    }
                    return (
                      errorMessage ||
                      "Failed to load snapshot history. Please try again."
                    );
                  })()}
                </AlertDescription>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              </Alert>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Snapshots</CardTitle>
              <CardDescription>Showing {limit} per page</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-6 w-64 bg-muted rounded" />
                  <div className="h-6 w-64 bg-muted rounded" />
                  <div className="h-6 w-64 bg-muted rounded" />
                </div>
              ) : !snapshotHistory || snapshotHistory.data.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <svg
                      className="mx-auto h-12 w-12 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No snapshots yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Snapshots capture your portfolio at a specific moment in
                    time. Create your first snapshot from the dashboard to start
                    tracking your portfolio history.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/dashboard">
                      <Button>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Create First Snapshot
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={() => refetch()}>
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refresh
                    </Button>
                  </div>
                  <div className="mt-8 text-xs text-muted-foreground">
                    <p className="mb-2">
                      💡 <strong>Pro tip:</strong>
                    </p>
                    <p>
                      Regular snapshots help you track portfolio performance
                      over time and compare different periods.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshotHistory.data.map((snap) => (
                    <Link
                      href={`/snapshots/${snap.id}`}
                      key={snap.id}
                      className="flex items-center justify-between text-sm p-2 hover:bg-muted rounded-md transition-colors"
                    >
                      <span className="text-muted-foreground">
                        {new Date(snap.createdAt).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatCurrency(snap.totalValue)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({snap.tokenCount} tokens)
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={
                    isLoading ||
                    (page + 1) * limit >=
                      (snapshotHistory?.total ?? Number.MAX_SAFE_INTEGER)
                  }
                >
                  Next
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1}
                  {snapshotHistory?.total
                    ? ` of ${Math.ceil(snapshotHistory.total / limit)}`
                    : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

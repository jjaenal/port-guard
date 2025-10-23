"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { useSnapshotHistory } from "@/lib/hooks/useSnapshotHistory";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

export default function SnapshotsPage() {
  const { address, isConnected } = useAccount();
  const [page, setPage] = useState(0);
  const limit = 10;
  const { data: snapshotHistory, isLoading } = useSnapshotHistory(address, limit, page);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Snapshot History</h1>
          <p className="text-muted-foreground">Recent snapshots for your wallet</p>
        </div>
        <div className="flex gap-2">
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
            <CardDescription>Please connect your wallet to view snapshots</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Open the dashboard and connect your wallet first.</p>
          </CardContent>
        </Card>
      ) : (
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
              <p className="text-sm text-muted-foreground">No snapshots found.</p>
            ) : (
              <div className="space-y-2">
                {snapshotHistory.data.map((snap) => (
                  <Link 
                    href={`/snapshots/${snap.id}`} 
                    key={snap.id} 
                    className="flex items-center justify-between text-sm p-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <span className="text-muted-foreground">{new Date(snap.createdAt).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(snap.totalValue)}</span>
                      <span className="text-xs text-muted-foreground">({snap.tokenCount} tokens)</span>
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
                  isLoading || ((page + 1) * limit >= (snapshotHistory?.total ?? Number.MAX_SAFE_INTEGER))
                }
              >
                Next
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1}{snapshotHistory?.total ? ` of ${Math.ceil(snapshotHistory.total / limit)}` : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
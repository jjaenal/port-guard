"use client";

import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useSnapshotDetail } from "@/lib/hooks/useSnapshotDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function SnapshotDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isConnected } = useAccount();
  const snapshotId = typeof id === "string" ? id : "";
  
  const { data: snapshotData, isLoading, error } = useSnapshotDetail(snapshotId);
  
  // Format date to local string
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isConnected) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please connect your wallet to view snapshot details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      ) : error || !snapshotData?.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load snapshot details. The snapshot may not exist.</p>
            <div className="mt-4">
              <Link href="/snapshots">
                <Button>View All Snapshots</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Snapshot Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="text-lg font-medium">
                    {formatDate(snapshotData.data.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-lg font-medium">
                    {formatCurrency(snapshotData.data.totalValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Token Count</p>
                  <p className="text-lg font-medium">
                    {snapshotData.data.tokenCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Address</p>
                  <p className="text-lg font-medium truncate">
                    {snapshotData.data.address}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshotData.data.tokens.length === 0 ? (
                <p>No tokens in this snapshot.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Token</th>
                        <th className="text-right py-3 px-4">Balance</th>
                        <th className="text-right py-3 px-4">Price</th>
                        <th className="text-right py-3 px-4">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotData.data.tokens.map((token) => (
                        <tr key={token.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {token.logo && (
                                <img
                                  src={token.logo}
                                  alt={token.symbol}
                                  className="w-6 h-6 mr-2 rounded-full"
                                />
                              )}
                              <div>
                                <div className="font-medium">{token.symbol}</div>
                                <div className="text-xs text-muted-foreground">
                                  {token.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            {parseFloat(token.balance).toFixed(6)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {formatCurrency(token.price)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {formatCurrency(token.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
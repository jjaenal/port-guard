"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSnapshotHistory } from "@/lib/hooks/useSnapshotHistory";
import { formatCurrency, formatPercentSigned } from "@/lib/utils";
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { useSnapshotDetail } from "@/lib/hooks/useSnapshotDetail";
import type { SnapshotItem } from "@/lib/hooks/useSnapshotHistory";
import type { SnapshotToken } from "@/lib/hooks/useSnapshotDetail";

export default function CompareSnapshotsPage() {
  const { address, isConnected } = useAccount();
  const [page, setPage] = useState(0);
  const limit = 10;
  const { data: snapshotHistory, isLoading } = useSnapshotHistory(address, limit, page);
  
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const [tokenFilter, setTokenFilter] = useState<"all" | "up" | "down">("all");
  const [tokenQuery, setTokenQuery] = useState("");
  const [sortBy, setSortBy] = useState<"abs" | "percent" | "symbol">("abs");
  
  useEffect(() => {
    const a = params.get("a");
    const b = params.get("b");
    if (a && b) {
      setSelectedSnapshots([a, b]);
      setCompareMode(true);
    }
  }, [params]);
  const { data: snapshot1Data, isLoading: isLoading1 } = useSnapshotDetail(
    selectedSnapshots[0]
  );
  
  const { data: snapshot2Data, isLoading: isLoading2 } = useSnapshotDetail(
    selectedSnapshots[1]
  );
  
  const handleSelectSnapshot = (id: string) => {
    if (selectedSnapshots.includes(id)) {
      setSelectedSnapshots(selectedSnapshots.filter(s => s !== id));
    } else {
      if (selectedSnapshots.length < 2) {
        setSelectedSnapshots([...selectedSnapshots, id]);
      } else {
        // Replace the oldest selection
        setSelectedSnapshots([selectedSnapshots[1], id]);
      }
    }
  };
  
  const handleCompare = () => {
    if (selectedSnapshots.length === 2) {
      setCompareMode(true);
    }
  };
  
  const resetSelection = () => {
    setSelectedSnapshots([]);
    setCompareMode(false);
  };
  
  // Calculate differences between snapshots
  const calculateDifference = () => {
    if (!snapshot1Data?.data || !snapshot2Data?.data) return null;
    
    const snapshot1 = snapshot1Data.data;
    const snapshot2 = snapshot2Data.data;
    
    const valueDiff = snapshot2.totalValue - snapshot1.totalValue;
    const percentDiff = snapshot1.totalValue > 0 
      ? (valueDiff / snapshot1.totalValue) * 100 
      : 0;
    
    // Compare tokens
    const tokenMap = new Map<string, {
      symbol: string;
      name: string;
      snapshot1Value: number;
      snapshot1Balance: string;
      snapshot2Value: number;
      snapshot2Balance: string;
      diff: number;
      percentDiff: number;
    }>();
    
    // Add all tokens from snapshot1
    snapshot1.tokens.forEach((token: SnapshotToken) => {
      tokenMap.set(token.address, {
        symbol: token.symbol,
        name: token.name,
        snapshot1Value: token.value,
        snapshot1Balance: token.balance,
        snapshot2Value: 0,
        snapshot2Balance: "0",
        diff: -token.value,
        percentDiff: -100
      });
    });
    
    // Update or add tokens from snapshot2
    snapshot2.tokens.forEach((token: SnapshotToken) => {
      if (tokenMap.has(token.address)) {
        const existing = tokenMap.get(token.address)!;
        existing.snapshot2Value = token.value;
        existing.snapshot2Balance = token.balance;
        existing.diff = token.value - existing.snapshot1Value;
        existing.percentDiff = existing.snapshot1Value > 0 
          ? (existing.diff / existing.snapshot1Value) * 100 
          : (existing.snapshot1Value === 0 && token.value > 0 ? 100 : 0);
        tokenMap.set(token.address, existing);
      } else {
        tokenMap.set(token.address, {
          symbol: token.symbol,
          name: token.name,
          snapshot1Value: 0,
          snapshot1Balance: "0",
          snapshot2Value: token.value,
          snapshot2Balance: token.balance,
          diff: token.value,
          percentDiff: 100
        });
      }
    });
    
    // Convert map to array and sort by absolute difference
    const tokenComparisons = Array.from(tokenMap.values())
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    
    return {
      valueDiff,
      percentDiff,
      tokenComparisons
    };
  };
  
  const comparison = calculateDifference();
  const displayTokens = useMemo(() => {
    if (!comparison) return [] as Array<{
      symbol: string; name: string; snapshot1Value: number; snapshot1Balance: string; snapshot2Value: number; snapshot2Balance: string; diff: number; percentDiff: number;
    }>;
    let arr = [...comparison.tokenComparisons];
    if (tokenFilter !== "all") {
      arr = arr.filter(t => (tokenFilter === "up" ? t.diff > 0 : t.diff < 0));
    }
    if (tokenQuery) {
      const q = tokenQuery.toLowerCase();
      arr = arr.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "percent":
        arr.sort((a, b) => Math.abs(b.percentDiff) - Math.abs(a.percentDiff));
        break;
      case "symbol":
        arr.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      default:
        arr.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    }
    return arr;
  }, [comparison, tokenFilter, tokenQuery, sortBy]);
  
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Compare Snapshots</h1>
            <p className="text-muted-foreground">Compare portfolio changes over time</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to compare snapshots</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Open the dashboard and connect your wallet first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Compare Snapshots</h1>
          <p className="text-muted-foreground">Compare portfolio changes over time</p>
        </div>
        <div className="flex gap-2">
          {compareMode && (
            <Button variant="outline" onClick={resetSelection}>
              Reset
            </Button>
          )}
          {compareMode && selectedSnapshots.length === 2 && (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  const url = `${window.location.origin}/snapshots/compare?a=${selectedSnapshots[0]}&b=${selectedSnapshots[1]}`;
                  await navigator.clipboard.writeText(url);
                  setCopyMsg("Link copied");
                  setTimeout(() => setCopyMsg(""), 2000);
                }}
              >
                Copy Link
              </Button>
              {copyMsg && <span className="text-xs text-muted-foreground">{copyMsg}</span>}
            </>
          )}
          <Link href="/snapshots">
            <Button variant="outline">All Snapshots</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
      
      {!compareMode ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Select Two Snapshots to Compare</h2>
              <p className="text-sm text-muted-foreground">
                Selected: {selectedSnapshots.length}/2
              </p>
            </div>
            <Button 
              onClick={handleCompare} 
              disabled={selectedSnapshots.length !== 2}
            >
              Compare Selected
            </Button>
          </div>
          
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
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No snapshots found</p>
                  <Link href="/dashboard" className="mt-4 inline-block">
                    <Button>Create a Snapshot</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshotHistory.data.map((snapshot: SnapshotItem) => (
                    <div
                      key={snapshot.id}
                      className={`flex items-center justify-between p-3 rounded-md border ${
                        selectedSnapshots.includes(snapshot.id) ? "bg-muted border-primary" : ""
                      }`}
                      onClick={() => handleSelectSnapshot(snapshot.id)}
                    >
                      <div>
                        <div className="font-medium">{formatCurrency(snapshot.totalValue)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(snapshot.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          {snapshot.tokenCount} tokens
                        </div>
                        <Button
                          variant={selectedSnapshots.includes(snapshot.id) ? "default" : "outline"}
                          size="sm"
                        >
                          {selectedSnapshots.includes(snapshot.id) ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={!snapshotHistory || snapshotHistory.data.length < limit}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          {(isLoading1 || isLoading2) ? (
            <Card>
              <CardContent className="py-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 w-64 bg-muted rounded" />
                  <div className="h-6 w-full bg-muted rounded" />
                  <div className="h-6 w-full bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ) : !snapshot1Data?.data || !snapshot2Data?.data ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Error loading snapshots</p>
                <Button onClick={resetSelection} className="mt-4">
                  Go Back
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Comparison</CardTitle>
                  <CardDescription>
                    Comparing snapshots from{" "}
                    {new Date(snapshot1Data.data.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    to{" "}
                    {new Date(snapshot2Data.data.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Initial Value</div>
                      <div className="text-2xl font-bold">{formatCurrency(snapshot1Data.data.totalValue)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(snapshot1Data.data.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Current Value</div>
                      <div className="text-2xl font-bold">{formatCurrency(snapshot2Data.data.totalValue)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(snapshot2Data.data.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Change</div>
                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${comparison && comparison.valueDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(comparison?.valueDiff || 0)}
                        </div>
                        {comparison && comparison.valueDiff !== 0 && (
                          comparison.valueDiff > 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )
                        )}
                      </div>
                      <div className={`text-sm ${comparison && comparison.percentDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatPercentSigned(comparison?.percentDiff || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Token Changes</CardTitle>
                  <CardDescription>
                    Changes in token values between snapshots
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={tokenFilter === "all" ? "default" : "outline"} onClick={() => setTokenFilter("all")}>All</Button>
                      <Button size="sm" variant={tokenFilter === "up" ? "default" : "outline"} onClick={() => setTokenFilter("up")}>Up</Button>
                      <Button size="sm" variant={tokenFilter === "down" ? "default" : "outline"} onClick={() => setTokenFilter("down")}>Down</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={tokenQuery} onChange={(e) => setTokenQuery(e.target.value)} placeholder="Search token..." className="w-48" />
                      <select className="border rounded px-2 py-1 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                        <option value="abs">Sort: Diff</option>
                        <option value="percent">Sort: Percent</option>
                        <option value="symbol">Sort: Symbol</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Token</th>
                          <th className="text-right py-2">Initial Value</th>
                          <th className="text-right py-2">Current Value</th>
                          <th className="text-right py-2">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayTokens.map((token, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2">
                              <div className="font-medium">{token.symbol}</div>
                              <div className="text-xs text-muted-foreground">{token.name}</div>
                            </td>
                            <td className="text-right py-2">
                              <div>{formatCurrency(token.snapshot1Value)}</div>
                              <div className="text-xs text-muted-foreground">
                                {parseFloat(token.snapshot1Balance).toFixed(4)}
                              </div>
                            </td>
                            <td className="text-right py-2">
                              <div>{formatCurrency(token.snapshot2Value)}</div>
                              <div className="text-xs text-muted-foreground">
                                {parseFloat(token.snapshot2Balance).toFixed(4)}
                              </div>
                            </td>
                            <td className="text-right py-2">
                              <div className={`font-medium ${token.diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(token.diff)}
                              </div>
                              <div className={`text-xs ${token.diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatPercentSigned(token.percentDiff)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
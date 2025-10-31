"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertCircle,
  Bell,
  Plus,
  Loader2,
  BellOff,
  Trash2,
  BellRing,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Alert {
  id: string;
  type: string;
  tokenSymbol: string;
  tokenAddress: string | null;
  chain: string | null;
  operator: string;
  value: number;
  enabled: boolean;
  createdAt: string;
  lastTriggered: string | null;
}

export default function AlertsPage() {
  const { address, isConnected } = useAccount();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"price" | "portfolio">("price");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [operator, setOperator] = useState("above");
  const [value, setValue] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(true);

  // useEffect moved below to avoid using fetchAlerts before declaration

  const fetchAlerts = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/alerts?address=${address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch {
      toast.error("Failed to load alerts", {
        description: "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchAlerts();
    }
  }, [isConnected, address, fetchAlerts]);

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    if (!address) return;

    try {
      const response = await fetch(
        `/api/alerts?address=${address}&id=${alertId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update alert");
      }

      toast.success(enabled ? "Alert enabled" : "Alert disabled");

      // Update local state
      setAlerts(
        alerts.map((alert) =>
          alert.id === alertId ? { ...alert, enabled } : alert,
        ),
      );
    } catch (error) {
      toast.error("Failed to update alert", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!address) return;

    try {
      const response = await fetch(
        `/api/alerts?address=${address}&id=${alertId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete alert");
      }

      toast.success("Alert deleted");

      // Update local state
      setAlerts(alerts.filter((alert) => alert.id !== alertId));
    } catch (error) {
      toast.error("Failed to delete alert", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    }
  };

  // Placeholder for actual alert creation
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || !operator) {
      toast.error("Please fill all required fields");
      return;
    }
    if (type === "price" && !tokenSymbol) {
      toast.error("Token symbol is required for price alerts");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/alerts?address=${address}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          type === "price"
            ? {
                type,
                tokenSymbol,
                tokenAddress,
                chain,
                operator,
                value,
              }
            : {
                type,
                operator,
                value,
              },
        ),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create alert");
      }

      toast.success(
        type === "price"
          ? "Price alert created successfully"
          : "Portfolio alert created successfully",
        {
          description:
            type === "price"
              ? `You'll be notified when ${tokenSymbol} goes ${operator} $${value}`
              : `You'll be notified when portfolio value goes ${operator} $${value}`,
        },
      );

      // Reset form
      setShowForm(false);
      setTokenSymbol("");
      setTokenAddress("");
      setValue("");
      setOperator("above");
      setType("price");

      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to create alert", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alerts
            </CardTitle>
            <CardDescription>
              Get notified when tokens reach target price or portfolio
              milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Connect your wallet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Connect your wallet to create and manage alerts for your
                portfolio
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alerts
            </CardTitle>
            <CardDescription>
              Get notified when tokens reach target price or portfolio
              milestones
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "default"}
          >
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                New Alert
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm ? (
            <form
              onSubmit={handleCreateAlert}
              className="space-y-4 border rounded-lg p-4"
            >
              <h3 className="text-lg font-medium">Create Alert</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alert Type</label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as typeof type)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select alert type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">Token Price</SelectItem>
                      <SelectItem value="portfolio">Portfolio Value</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <Select value={operator} onValueChange={setOperator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Opsi operator: untuk Portfolio hanya dukung above/below sebagai milestone */}
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                      {type === "price" && (
                        <>
                          <SelectItem value="percent_increase">
                            % Increase
                          </SelectItem>
                          <SelectItem value="percent_decrease">
                            % Decrease
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {type === "portfolio" ? "Portfolio Value (USD)" : "Value"}
                  </label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
              </div>
              {type === "price" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Token Symbol
                      </label>
                      <Input
                        placeholder="ETH"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Token Address (Optional)
                      </label>
                      <Input
                        placeholder="0x..."
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Chain</label>
                      <Select value={chain} onValueChange={setChain}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select chain" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ethereum">Ethereum</SelectItem>
                          <SelectItem value="polygon">Polygon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Alert"}
                </Button>
              </div>
            </form>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Loading alerts...</h3>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No alerts yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Create your first price alert to get notified when tokens reach
                your target price
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Your Alerts</h3>
                <div className="divide-y border rounded-lg">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {alert.type === "portfolio"
                            ? "Portfolio"
                            : alert.tokenSymbol}{" "}
                          {alert.operator === "above"
                            ? ">"
                            : alert.operator === "below"
                              ? "<"
                              : alert.operator === "percent_increase"
                                ? "↑"
                                : "↓"}{" "}
                          {alert.operator.includes("percent")
                            ? `${alert.value}%`
                            : `$${alert.value}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {alert.type === "portfolio"
                            ? "Portfolio"
                            : alert.chain || "All chains"}{" "}
                          • Created{" "}
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </p>
                        {alert.lastTriggered && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <BellRing className="h-3 w-3" />
                            Triggered{" "}
                            {new Date(alert.lastTriggered).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={
                            alert.enabled ? "Disable alert" : "Enable alert"
                          }
                          onClick={() =>
                            handleToggleAlert(alert.id, !alert.enabled)
                          }
                        >
                          {alert.enabled ? (
                            <Bell className="h-4 w-4" />
                          ) : (
                            <BellOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete alert"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Recent Notifications</h3>
                  <Button
                    variant="ghost"
                    onClick={() => setShowRecent((v) => !v)}
                  >
                    {showRecent ? "Hide" : "Show"}
                  </Button>
                </div>
                {showRecent &&
                  (() => {
                    const recent = alerts
                      .filter((a) => a.lastTriggered)
                      .sort((a, b) => {
                        const at = a.lastTriggered
                          ? new Date(a.lastTriggered).getTime()
                          : 0;
                        const bt = b.lastTriggered
                          ? new Date(b.lastTriggered).getTime()
                          : 0;
                        return bt - at;
                      });
                    if (recent.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg">
                          <BellOff className="h-6 w-6 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No notifications yet
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="divide-y border rounded-lg">
                        {recent.map((alert) => (
                          <div
                            key={`recent-${alert.id}`}
                            className="p-4 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                <BellRing className="h-4 w-4 text-green-600" />
                                {alert.type === "portfolio"
                                  ? "Portfolio"
                                  : alert.tokenSymbol}{" "}
                                notification
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {alert.operator}{" "}
                                {alert.operator.includes("percent")
                                  ? `${alert.value}%`
                                  : `$${alert.value}`}
                                {alert.chain ? ` • ${alert.chain}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {alert.lastTriggered
                                  ? new Date(
                                      alert.lastTriggered,
                                    ).toLocaleString()
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  toast.info("Notification acknowledged")
                                }
                              >
                                Acknowledge
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

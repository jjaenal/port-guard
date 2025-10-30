"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConnectButton } from "@rainbow-me/rainbowkit";

type AlertSummary = {
  type: "price" | "portfolio";
  tokenSymbol?: string | null;
  operator?: "above" | "below" | null;
  value?: number | null;
};

type NotificationItem = {
  id: string;
  alertId: string;
  address: string;
  title: string;
  message: string;
  type: "price" | "portfolio" | "system";
  isRead: boolean;
  triggeredAt: string; // ISO string from API
  readAt: string | null;
  alert?: AlertSummary;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

function useNotifications(
  address?: string,
  isRead?: boolean,
  limit = 20,
  offset = 0,
): UseQueryResult<NotificationsResponse, Error> {
  return useQuery<NotificationsResponse, Error>({
    queryKey: [
      "notifications",
      address?.toLowerCase(),
      { isRead, limit, offset },
    ],
    enabled: Boolean(address),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("address", address!.toLowerCase());
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (typeof isRead === "boolean") params.set("isRead", String(isRead));

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to fetch notifications (${res.status})`,
        );
      }
      return res.json();
    },
    staleTime: 60_000,
    placeholderData: (previous) =>
      previous as NotificationsResponse | undefined,
  });
}

function useMarkReadUnread() {
  const qc = useQueryClient();
  return useMutation<
    { updated: number },
    Error,
    { ids: string[]; isRead: boolean; address: string }
  >({
    mutationFn: async ({ ids, isRead, address }) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids, isRead, address }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to update notifications (${res.status})`,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function NotificationsPage() {
  const { address } = useAccount();
  const [isReadFilter, setIsReadFilter] = useState<"all" | "read" | "unread">(
    "all",
  );
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const isRead = useMemo(() => {
    if (isReadFilter === "read") return true;
    if (isReadFilter === "unread") return false;
    return undefined;
  }, [isReadFilter]);

  const { data, isLoading, error, isFetching } = useNotifications(
    address,
    isRead,
    limit,
    offset,
  );
  const markMutation = useMarkReadUnread();

  const total = data?.pagination.total ?? 0;
  const hasMore = data?.pagination.hasMore ?? false;

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected],
  );

  const toggleSelection = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearSelection = () => setSelected({});

  const onMark = async (read: boolean, ids?: string[]) => {
    if (!address) return;
    const targetIds = ids && ids.length ? ids : selectedIds;
    if (!targetIds.length) return;
    await markMutation.mutateAsync({ ids: targetIds, isRead: read, address });
    clearSelection();
  };

  const onPrev = () => setOffset((o) => Math.max(0, o - limit));
  const onNext = () => setOffset((o) => o + limit);

  if (!address) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Connect your wallet to view notifications.</p>
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter"
                value={isReadFilter}
                onChange={(e) => {
                  setIsReadFilter(e.target.value as typeof isReadFilter);
                  setOffset(0);
                }}
                className="border rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              <select
                aria-label="Page size"
                value={String(limit)}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setLimit(v);
                  setOffset(0);
                }}
                className="border rounded px-2 py-1"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={!selectedIds.length || markMutation.isPending}
                onClick={() => onMark(false)}
              >
                Mark selected unread
              </Button>
              <Button
                disabled={!selectedIds.length || markMutation.isPending}
                onClick={() => onMark(true)}
              >
                Mark selected read
              </Button>
            </div>
          </div>

          {error && <div className="text-red-600 mb-3">{error.message}</div>}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">Sel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7}>Loading...</TableCell>
                  </TableRow>
                )}
                {!isLoading && (data?.notifications?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>No notifications</TableCell>
                  </TableRow>
                )}
                {data?.notifications?.map((n: NotificationItem) => (
                  <TableRow key={n.id} className={n.isRead ? "opacity-70" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${n.id}`}
                        checked={Boolean(selected[n.id])}
                        onChange={() => toggleSelection(n.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {n.isRead ? (
                        <span className="text-gray-500">Read</span>
                      ) : (
                        <span className="text-blue-600 font-medium">
                          Unread
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{n.title}</TableCell>
                    <TableCell>{n.message}</TableCell>
                    <TableCell className="capitalize">{n.type}</TableCell>
                    <TableCell>{formatDateTime(n.triggeredAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {n.isRead ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onMark(false, [n.id])}
                            disabled={markMutation.isPending}
                          >
                            Mark unread
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onMark(true, [n.id])}
                            disabled={markMutation.isPending}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Total: {total} {isFetching ? "(updating...)" : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={onPrev}
                disabled={offset === 0 || isFetching}
              >
                Prev
              </Button>
              <Button onClick={onNext} disabled={!hasMore || isFetching}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

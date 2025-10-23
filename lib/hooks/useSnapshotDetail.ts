import { useQuery } from "@tanstack/react-query";

export type SnapshotToken = {
  id: string;
  symbol: string;
  name: string;
  address: string;
  balance: string;
  value: number;
  price: number;
  logo?: string;
};

export type SnapshotDetail = {
  id: string;
  address: string;
  totalValue: number;
  createdAt: string;
  tokenCount: number;
  tokens: SnapshotToken[];
};

export function useSnapshotDetail(snapshotId?: string) {
  return useQuery<{ data: SnapshotDetail } | null>({
    queryKey: ["snapshot-detail", snapshotId],
    enabled: !!snapshotId,
    staleTime: 600_000, // 10 minutes
    gcTime: 900_000, // 15 minutes
    retry: 1,
    queryFn: async () => {
      if (!snapshotId) return null;
      const url = `/api/snapshots/${snapshotId}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch snapshot details");
      }
      const json = await res.json();
      return json as { data: SnapshotDetail };
    },
  });
}
import { useQuery } from "@tanstack/react-query";

export type SnapshotItem = {
  id: string;
  address: string;
  totalValue: number;
  createdAt: string;
  tokenCount: number;
};

export function useSnapshotHistory(
  address?: string,
  limit: number = 5,
  page: number = 0,
) {
  const offset = Math.max(0, page) * Math.max(1, limit);
  return useQuery<{ data: SnapshotItem[]; total: number } | null>({
    queryKey: ["snapshot-history", address?.toLowerCase(), limit, page],
    enabled: !!address && limit > 0,
    staleTime: 300_000,
    gcTime: 600_000,
    retry: 1,
    queryFn: async () => {
      if (!address) return null;
      const url = `/api/snapshots?address=${address}&limit=${limit}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) {
        // For history, treat empty as null; consumer can show fallback
        return null;
      }
      const json = await res.json();
      return json as { data: SnapshotItem[]; total: number };
    },
  });
}
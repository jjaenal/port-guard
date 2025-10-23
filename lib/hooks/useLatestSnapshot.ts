import { useQuery } from "@tanstack/react-query";

interface SnapshotToken {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  price: number;
  value: number;
}

interface LatestSnapshot {
  id: string;
  address: string;
  totalValue: number;
  createdAt: string;
  tokens: SnapshotToken[];
}

/**
 * Hook to fetch the latest portfolio snapshot for a wallet address.
 * 
 * @param address - Ethereum wallet address
 * @returns Query result with latest snapshot data
 */
export function useLatestSnapshot(address: string | undefined) {
  return useQuery({
    queryKey: ["latest-snapshot", address],
    queryFn: async (): Promise<LatestSnapshot> => {
      if (!address) {
        throw new Error("Address is required");
      }

      const response = await fetch(`/api/snapshots?address=${address}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No snapshot found");
        }
        throw new Error("Failed to fetch snapshot");
      }

      return response.json();
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
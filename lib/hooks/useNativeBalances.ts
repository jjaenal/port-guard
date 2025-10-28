/**
 * Hook untuk mengambil saldo native ETH (mainnet) dan MATIC (polygon)
 * untuk alamat wallet yang sedang terhubung.
 *
 * Menggunakan wagmi v2 `useBalance` per chain dan mengembalikan
 * data terformat bersama status loading.
 *
 * @returns Objek saldo { eth, matic, isLoading }
 */
import { useAccount, useBalance } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";
import { useEffect } from "react";
import { toast } from "sonner";

export type NativeBalance = {
  formatted: string;
  symbol: string;
  decimals: number;
  value: bigint;
};

export type NativeBalances = {
  eth?: NativeBalance;
  matic?: NativeBalance;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  refetch: () => void;
};

export function useNativeBalances(): NativeBalances {
  const { address } = useAccount();

  const eth = useBalance({
    address,
    chainId: mainnet.id,
    query: {
      enabled: !!address,
      staleTime: 300_000,
      refetchInterval: 300_000,
      retry: (failureCount) => failureCount < 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  });
  const matic = useBalance({
    address,
    chainId: polygon.id,
    query: {
      enabled: !!address,
      staleTime: 300_000,
      refetchInterval: 300_000,
      retry: (failureCount) => failureCount < 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  });

  const isLoading = !!address && (eth.isLoading || matic.isLoading);
  const isFetching = !!address && (eth.isFetching || matic.isFetching);
  const isError = !!address && (!!eth.error || !!matic.error);

  let errorMessage: string | undefined;
  const rawError = (eth.error || matic.error) as Error | undefined;
  if (rawError?.message) {
    const msg = rawError.message;
    if (msg.includes("fetch")) {
      errorMessage =
        "Network connection issue. Check your internet connection and try again.";
    } else if (msg.toLowerCase().includes("timeout")) {
      errorMessage = "RPC timeout. Please try again in a moment.";
    } else {
      errorMessage = "Unable to fetch native balances. Values may be outdated.";
    }
  } else if (!!address && !!eth.error && !!matic.error) {
    errorMessage =
      "Both chains failed to fetch balances. Please check your connection.";
  }

  return {
    eth: eth.data
      ? {
          formatted: eth.data.formatted,
          symbol: eth.data.symbol,
          decimals: eth.data.decimals,
          value: eth.data.value,
        }
      : undefined,
    matic: matic.data
      ? {
          formatted: matic.data.formatted,
          symbol: matic.data.symbol,
          decimals: matic.data.decimals,
          value: matic.data.value,
        }
      : undefined,
    isLoading,
    isFetching,
    isError,
    errorMessage,
    refetch: () => {
      eth.refetch();
      matic.refetch();
    },
  };
}

// Side-effect to surface user-friendly toasts when errors occur
export function useNativeBalancesToasts() {
  const { isError, errorMessage, refetch } = useNativeBalances();
  useEffect(() => {
    if (isError) {
      toast.error(errorMessage ?? "Failed to fetch native balances", {
        description: "We will retry automatically. You can also tap to retry.",
        action: { label: "Retry", onClick: () => refetch() },
      });
    }
  }, [isError, errorMessage, refetch]);
}

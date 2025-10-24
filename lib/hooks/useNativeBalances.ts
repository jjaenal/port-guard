/**
 * Hook untuk mengambil saldo native ETH (mainnet) dan MATIC (polygon)
 * untuk alamat wallet yang sedang terhubung.
 *
 * Menggunakan wagmi v2 `useBalance` per chain dan mengembalikan
 * data terformat bersama status loading.
 *
 * @returns Objek saldo { eth, matic, isLoading, refetch }
 */
import { useAccount, useBalance } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";

export type NativeBalance = {
  formatted: string;
  symbol: string;
  decimals: number;
  value: bigint;
  updatedAt?: number;
};

export type NativeBalances = {
  eth?: NativeBalance;
  matic?: NativeBalance;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => Promise<void>;
  updatedAt?: number;
};

export function useNativeBalances(): NativeBalances {
  const { address } = useAccount();

  const eth = useBalance({
    address,
    chainId: mainnet.id,
    query: { enabled: !!address },
  });
  const matic = useBalance({
    address,
    chainId: polygon.id,
    query: { enabled: !!address },
  });

  const isLoading = !!address && (eth.isLoading || matic.isLoading);
  const isError = eth.isError || matic.isError;
  const error = eth.error || matic.error || undefined;

  const refetch = async () => {
    await Promise.all([eth.refetch(), matic.refetch()]);
  };

  const nativeUpdatedAt =
    Math.max(eth.dataUpdatedAt ?? 0, matic.dataUpdatedAt ?? 0) || undefined;

  return {
    eth: eth.data
      ? {
          formatted: eth.data.formatted,
          symbol: eth.data.symbol,
          decimals: eth.data.decimals,
          value: eth.data.value,
          updatedAt: eth.dataUpdatedAt,
        }
      : undefined,
    matic: matic.data
      ? {
          formatted: matic.data.formatted,
          symbol: matic.data.symbol,
          decimals: matic.data.decimals,
          value: matic.data.value,
          updatedAt: matic.dataUpdatedAt,
        }
      : undefined,
    isLoading,
    isError,
    error,
    refetch,
    updatedAt: nativeUpdatedAt,
  };
}

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTokenHoldings } from "./useTokenHoldings";
import type { TokenHoldingsQueryResult } from "./useTokenHoldings";

// Mock wagmi useAccount to avoid requiring WagmiProvider
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({ address: "0xabc" })),
}));
import type { TokenHoldingDTO } from "@/lib/blockchain/balances";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: 0 } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe("useTokenHoldings Hook", () => {
  it("should be defined", () => {
    expect(useTokenHoldings).toBeDefined();
  });

  it(
    "sets meta.source to balances:cache when X-Cache is HIT",
    async () => {
    const mockTokens: TokenHoldingDTO[] = [
      {
        chain: "ethereum",
        contractAddress: "0xtoken",
        symbol: "AAA",
        name: "Token AAA",
        balance: "1000000000000000000",
        decimals: 18,
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            text: vi
              .fn()
              .mockResolvedValue(JSON.stringify({ tokens: mockTokens })),
            headers: {
              get: vi
                .fn()
                .mockImplementation((k: string) =>
                  k.toLowerCase() === "x-cache" ? "HIT" : null,
                ),
            },
          }) as unknown as Response,
      ),
    );

    const { result } = renderHook(() => useTokenHoldings("0xabc"), {
      wrapper: createWrapper(),
    });
      const res = await result.current.refetch();
      const meta = (res.data as TokenHoldingsQueryResult | undefined)?.meta;
      expect(meta?.source).toBe("balances:cache");
    },
    15000,
  );

  it("sets meta.source to balances:api when X-Cache is MISS or absent", async () => {
    const mockTokens: TokenHoldingDTO[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            text: vi
              .fn()
              .mockResolvedValue(JSON.stringify({ tokens: mockTokens })),
            headers: {
              get: vi
                .fn()
                .mockImplementation((k: string) =>
                  k.toLowerCase() === "x-cache" ? "MISS" : null,
                ),
            },
          }) as unknown as Response,
      ),
    );

    const { result } = renderHook(() => useTokenHoldings("0xabc"), {
      wrapper: createWrapper(),
    });
    const res = await result.current.refetch();
    const meta = (res.data as TokenHoldingsQueryResult | undefined)?.meta;
    expect(meta?.source).toBe("balances:api");
  });
});

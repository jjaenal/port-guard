import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSnapshotDetail } from "./useSnapshotDetail";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useSnapshotDetail - error parsing", () => {
  it("surfaces specific 404 message from API body JSON", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      text: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ error: "Snapshot not found" })),
    });

    const { result } = renderHook(() => useSnapshotDetail("does-not-exist"), {
      wrapper: createWrapper(),
    });

    const res404 = await result.current.refetch();
    expect(res404.isError).toBe(true);
    expect((res404.error as Error)?.message).toBe("Snapshot not found");
  });

  it("surfaces specific 400 message from API body JSON", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ message: "Snapshot ID is required" }),
        ),
    });

    const { result } = renderHook(() => useSnapshotDetail("bad-id"), {
      wrapper: createWrapper(),
    });

    const res400 = await result.current.refetch();
    expect(res400.isError).toBe(true);
    expect((res400.error as Error)?.message).toBe("Snapshot ID is required");
  });

  it("falls back to status + raw text when body is not JSON (500)", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("Internal Server Error"),
    });

    const { result } = renderHook(() => useSnapshotDetail("any-id"), {
      wrapper: createWrapper(),
    });

    const res500 = await result.current.refetch();
    expect(res500.isError).toBe(true);
    const msg = (res500.error as Error)?.message || "";
    expect(msg).toContain("Snapshot API error: 500");
    expect(msg).toContain("Internal Server Error");
  });
});

describe("useSnapshotDetail - success", () => {
  it("returns SnapshotDetail when API responds 200", async () => {
    const mockDetail = {
      id: "abc123",
      address: "0xabc",
      totalValue: 123.45,
      createdAt: "2025-10-25T00:00:00.000Z",
      tokenCount: 2,
      tokens: [
        {
          id: "t1",
          symbol: "ETH",
          name: "Ethereum",
          address: "0xEth",
          balance: "0.5",
          value: 100,
          price: 2000,
        },
        {
          id: "t2",
          symbol: "MATIC",
          name: "Polygon",
          address: "0xMat",
          balance: "10",
          value: 23.45,
          price: 2.345,
        },
      ],
    };
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: mockDetail }),
    });

    const { result } = renderHook(() => useSnapshotDetail("abc123"), {
      wrapper: createWrapper(),
    });

    const res = await result.current.refetch();
    expect(res.isSuccess).toBe(true);
    expect(res.data?.data.id).toBe("abc123");
    expect(res.data?.data.tokens.length).toBe(2);
  });
});

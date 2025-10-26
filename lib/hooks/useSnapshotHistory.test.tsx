import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSnapshotHistory } from "./useSnapshotHistory";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: 1 } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe("useSnapshotHistory - errors", () => {
  it("handles 404 with message 'Snapshot history not found'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: false,
            status: 404,
            text: vi.fn().mockResolvedValue("Snapshot history not found"),
          }) as { ok: boolean; status: number; text: () => Promise<string> },
      ),
    );

    const { result } = renderHook(() => useSnapshotHistory("0xabc", 5, 0), {
      wrapper: createWrapper(),
    });

    const res = await result.current.refetch();
    expect(res.isError).toBe(true);
    const msg = String((res.error as Error)?.message || "");
    expect(msg).toContain("Snapshots API error: 404");
    expect(msg).toContain("Snapshot history not found");
  });

  it("handles 500 with text 'Internal Server Error'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: false,
            status: 500,
            text: vi.fn().mockResolvedValue("Internal Server Error"),
          }) as { ok: boolean; status: number; text: () => Promise<string> },
      ),
    );

    const { result } = renderHook(() => useSnapshotHistory("0xabc", 5, 0), {
      wrapper: createWrapper(),
    });

    const res = await result.current.refetch();
    expect(res.isError).toBe(true);
    const msg = String((res.error as Error)?.message || "");
    expect(msg).toContain("Snapshots API error: 500");
    expect(msg).toContain("Internal Server Error");
  });
});

describe("useSnapshotHistory - success", () => {
  it("returns list when API responds 200", async () => {
    const mockItems = [
      {
        id: "id1",
        address: "0xabc",
        totalValue: 10,
        createdAt: "2025-10-25T00:00:00.000Z",
        tokenCount: 1,
      },
      {
        id: "id2",
        address: "0xabc",
        totalValue: 20,
        createdAt: "2025-10-24T00:00:00.000Z",
        tokenCount: 2,
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            json: vi.fn().mockResolvedValue({ data: mockItems, total: 2 }),
          }) as { ok: boolean; json: () => Promise<{ data: unknown; total: number }> },
      ),
    );

    const { result } = renderHook(() => useSnapshotHistory("0xabc", 5, 0), {
      wrapper: createWrapper(),
    });

    const res = await result.current.refetch();
    expect(res.isSuccess).toBe(true);
    expect(res.data?.data.length).toBe(2);
    expect(res.data?.total).toBe(2);
  });
});

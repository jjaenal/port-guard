import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabc", isConnected: true }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (k: string) => null }),
}));

// Baseline mock untuk useSnapshotDetail agar tidak memerlukan QueryClientProvider
const baselineRefetch = vi.fn();
vi.mock("@/lib/hooks/useSnapshotDetail", () => ({
  useSnapshotDetail: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: baselineRefetch,
  }),
}));

const mockRefetchHistory = vi.fn();
const mockRefetch1 = vi.fn();
const mockRefetch2 = vi.fn();

function mockUseSnapshotHistory(result: any) {
  vi.doMock("@/lib/hooks/useSnapshotHistory", () => ({
    useSnapshotHistory: () => ({
      data: result.data ?? null,
      isLoading: !!result.isLoading,
      error: result.error ?? null,
      refetch: mockRefetchHistory,
    }),
  }));
}

function mockUseSnapshotDetail(result1: any, result2?: any) {
  let call = 0;
  vi.doMock("@/lib/hooks/useSnapshotDetail", () => ({
    useSnapshotDetail: () => {
      call += 1;
      const res = call === 1 ? result1 : (result2 ?? result1);
      return {
        data: res.data ?? null,
        isLoading: !!res.isLoading,
        error: res.error ?? null,
        refetch: call === 1 ? mockRefetch1 : mockRefetch2,
      };
    },
  }));
}

// Helper untuk membuat objek useSearchParams yang stabil
function stableParams(params: Record<string, string | null>) {
  const obj = { get: (k: string) => (k in params ? params[k] : null) } as const;
  return obj;
}

describe("CompareSnapshots UI", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRefetchHistory.mockReset();
    mockRefetch1.mockReset();
    mockRefetch2.mockReset();
    baselineRefetch.mockReset();
  });

  it("shows history error alert with parsed message and retry", async () => {
    mockUseSnapshotHistory({
      error: new Error('Snapshots API error: 404 {"message":"Not found"}'),
    });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/Failed to load snapshots/i)).toBeInTheDocument();
    expect(screen.getByText(/Not found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows empty history state when no snapshots", async () => {
    mockUseSnapshotHistory({ data: { data: [], total: 0 }, isLoading: false });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/No snapshots found/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create a Snapshot/i }),
    ).toBeInTheDocument();
  });

  it("shows Pro tip when less than 2 selected and history present", async () => {
    mockUseSnapshotHistory({
      data: {
        data: [
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
        ],
        total: 2,
      },
      isLoading: false,
    });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/^Pro tip$/i)).toBeInTheDocument();
  });

  it("shows error card when one of the snapshots fails to load", async () => {
    const paramsObj = stableParams({ a: "snap1", b: "snap2" });
    vi.doMock("next/navigation", () => ({
      useSearchParams: () => paramsObj,
    }));
    mockUseSnapshotHistory({
      data: { data: [{ id: "snap1" }, { id: "snap2" }], total: 2 },
      isLoading: false,
    });
    mockUseSnapshotDetail({ data: null }, { data: null });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/Error loading snapshots/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Go Back/i }),
    ).toBeInTheDocument();
  });

  it("renders portfolio comparison when two snapshots are loaded", async () => {
    const paramsObj = stableParams({ a: "snap1", b: "snap2" });
    vi.doMock("next/navigation", () => ({
      useSearchParams: () => paramsObj,
    }));
    mockUseSnapshotHistory({
      data: { data: [{ id: "snap1" }, { id: "snap2" }], total: 2 },
      isLoading: false,
    });
    const snapshotData = (id: string) => ({
      data: {
        id,
        address: "0xabc",
        totalValue: id === "snap1" ? 100 : 120,
        createdAt:
          id === "snap1"
            ? "2025-10-20T00:00:00.000Z"
            : "2025-10-25T00:00:00.000Z",
        tokenCount: 1,
        tokens: [
          {
            id: `t-${id}`,
            symbol: "ETH",
            name: "Ethereum",
            address: "0xEth",
            balance: "0.5",
            value: 100,
            price: 2000,
          },
        ],
      },
    });
    mockUseSnapshotDetail(
      { data: snapshotData("snap1") },
      { data: snapshotData("snap2") },
    );
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/^Portfolio Comparison$/i)).toBeInTheDocument();
  });
});

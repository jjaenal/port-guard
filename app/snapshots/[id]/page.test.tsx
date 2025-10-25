import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: true }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "abc123" }),
  useRouter: () => ({ back: vi.fn() }),
}));

const mockRefetch = vi.fn();

// Helper to mock hook result
function mockUseSnapshotDetail(result: any) {
  vi.doMock("@/lib/hooks/useSnapshotDetail", () => ({
    useSnapshotDetail: () => ({
      data: result.data ?? null,
      isLoading: !!result.isLoading,
      error: result.error ?? null,
      refetch: mockRefetch,
    }),
  }));
}

describe("SnapshotDetailPage UI", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRefetch.mockReset();
  });

  it("renders error alert with message and retry", async () => {
    mockUseSnapshotDetail({ error: new Error("Snapshot not found") });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/Failed to load snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/Snapshot not found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("renders loading state", async () => {
    mockUseSnapshotDetail({ isLoading: true });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it("renders empty state when no data", async () => {
    mockUseSnapshotDetail({ data: null });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/No Data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No snapshot data available/i)
    ).toBeInTheDocument();
  });

  it("renders snapshot details when data present", async () => {
    mockUseSnapshotDetail({
      data: {
        data: {
          id: "abc123",
          address: "0xabc",
          totalValue: 100,
          createdAt: "2025-10-25T00:00:00.000Z",
          tokenCount: 1,
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
          ],
        },
      },
    });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/Snapshot Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Token Holdings/i)).toBeInTheDocument();
    expect(screen.getByText(/^ETH$/i)).toBeInTheDocument();
  });
});
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
// removed: import SnapshotsPage from "./page";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabc", isConnected: true }),
}));

const mockRefetch = vi.fn();

function mockUseSnapshotHistory(result: {
  data?: unknown;
  isLoading?: boolean;
  error?: unknown;
}) {
  vi.doMock("@/lib/hooks/useSnapshotHistory", () => ({
    useSnapshotHistory: () => ({
      data: result.data ?? null,
      isLoading: !!result.isLoading,
      error: result.error ?? null,
      refetch: mockRefetch,
    }),
  }));
}

describe("SnapshotsPage UI", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRefetch.mockReset();
  });

  it("shows error alert parsing API message and retry", async () => {
    mockUseSnapshotHistory({
      error: new Error('Snapshots API error: 404 {"message":"Not found"}'),
    });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/Failed to load snapshots/i)).toBeInTheDocument();
    expect(screen.getByText(/Not found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows empty state when no snapshots", async () => {
    mockUseSnapshotHistory({ data: { data: [], total: 0 }, isLoading: false });
    const Page = (await import("./page")).default;
    render(<Page />);
    expect(screen.getByText(/No snapshots yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Create First Snapshot/i)).toBeInTheDocument();
  });

  it("renders list when snapshots available", async () => {
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
    expect(screen.getByText(/^Snapshots$/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((a) => a.getAttribute("href")?.includes("/snapshots/")),
    ).toBe(true);
  });
});

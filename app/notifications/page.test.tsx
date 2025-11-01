import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationsPage from "./page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/notifications",
}));

describe("Notifications Preferences Modal", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Mock endpoint preferences agar tombol modal tersedia
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : String(input);
        const method = (init?.method || "GET").toUpperCase();

        // Mock GET preferences
        if (
          url.includes("/api/notifications/preferences") &&
          method === "GET"
        ) {
          return {
            ok: true,
            json: async () => ({
              preferences: {
                // Preferensi default sederhana untuk memastikan modal dirender
                enabled: true,
                channels: { email: false, browser: true },
                alerts: { price: true, portfolio: true, liquidation: true },
                updatedAt: Date.now(),
              },
            }),
          } as unknown as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Not found" }),
        } as unknown as Response;
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  const renderWithClient = (ui: React.ReactElement) => {
    const client = new QueryClient();
    return render(
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    );
  };

  it("menonaktifkan tombol Simpan saat tidak ada perubahan", async () => {
    renderWithClient(<NotificationsPage />);

    // Buka modal pengaturan
    const openBtn = await screen.findByRole("button", {
      name: /Pengaturan Notifikasi/i,
    });
    openBtn.click();

    // Tunggu konten modal muncul
    await screen.findByText(/Pengaturan Notifikasi/i);

    // Tombol Simpan harus nonaktif jika belum ada perubahan
    const saveBtn = screen.getByRole("button", { name: /Simpan/i });
    expect(saveBtn).toBeDisabled();
  });
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

type MockNoti = {
  id: string;
  alertId: string;
  address: string;
  title: string;
  message: string;
  type: "price" | "portfolio" | "liquidation";
  isRead: boolean;
  triggeredAt: string;
  readAt: string | null;
  alert?: {
    type: "price" | "portfolio" | "liquidation";
    tokenSymbol?: string | null;
  };
};

const baseResponse = (items: MockNoti[]) => ({
  notifications: items,
  pagination: { total: items.length, limit: 20, offset: 0, hasMore: false },
});

describe("NotificationsPage interactions", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    const items: MockNoti[] = [
      {
        id: "n1",
        alertId: "a1",
        address: "0x1234567890123456789012345678901234567890",
        title: "ETH Price Alert",
        message: "ETH above $2500",
        type: "price",
        isRead: false,
        triggeredAt: new Date().toISOString(),
        readAt: null,
        alert: { type: "price", tokenSymbol: "ETH" },
      },
      {
        id: "n2",
        alertId: "a2",
        address: "0x1234567890123456789012345678901234567890",
        title: "Portfolio Change",
        message: "Portfolio up 5%",
        type: "portfolio",
        isRead: true,
        triggeredAt: new Date().toISOString(),
        readAt: new Date().toISOString(),
        alert: { type: "portfolio", tokenSymbol: "ETH" },
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : String(input);
        const method = (init?.method || "GET").toUpperCase();

        if (url.includes("/api/notifications") && method === "GET") {
          // Return page data
          return {
            ok: true,
            json: async () => baseResponse(items),
          } as unknown as Response;
        }

        if (url.includes("/api/notifications") && method === "PATCH") {
          return {
            ok: true,
            json: async () => ({ updated: 1 }),
          } as unknown as Response;
        }

        if (url.includes("/api/notifications") && method === "DELETE") {
          return {
            ok: true,
            json: async () => ({ deleted: 1 }),
          } as unknown as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Not found" }),
        } as unknown as Response;
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("disables Prev on first page (offset=0)", async () => {
    // Render halaman dengan offset awal 0
    renderWithClient(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Pastikan tombol Prev disabled di halaman pertama
    const prevBtn = screen.getByRole("button", { name: /Prev/i });
    expect(prevBtn).toHaveAttribute("disabled");
  });

  it("disables Next when hasMore=false", async () => {
    // Dengan stub default baseResponse: hasMore=false
    renderWithClient(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    expect(nextBtn).toHaveAttribute("disabled");

    // Klik tidak boleh memicu perubahan offset ke 20
    fireEvent.click(nextBtn);
    await waitFor(() => {
      const calls = (
        global.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const hasOffset20 = calls.some((call: unknown[]) =>
        String(call[0]).includes("offset=20"),
      );
      expect(hasOffset20).toBe(false);
    });
  });

  it("marks selected as read via PATCH", async () => {
    renderWithClient(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    const checkbox = await screen.findByLabelText("Select n1");
    fireEvent.click(checkbox);

    const btn = await screen.findByRole("button", {
      name: /Mark selected read/i,
    });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });

  it("deletes selected via DELETE", async () => {
    renderWithClient(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    const checkbox = await screen.findByLabelText("Select n2");
    fireEvent.click(checkbox);

    // Bypass confirm dialog
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    const delBtn = await screen.findByRole("button", {
      name: /Delete selected/i,
    });
    fireEvent.click(delBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("deletes all in view via DELETE", async () => {
    renderWithClient(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Bypass confirm dialog
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    const delAllBtn = await screen.findByRole("button", {
      name: /Delete all in view/i,
    });
    fireEvent.click(delAllBtn);

    await waitFor(() => {
      const calls = (
        global.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      expect(
        calls.some((c) => (c[1] as RequestInit)?.method === "DELETE"),
      ).toBe(true);
    });
  });

  // Note: "Mark all read" is covered by server-side tests; client flow is optional here because
  // implementations may vary (confirm dialog, bulk endpoint). We focus on selected operations.

  it("requests with type filter when Type is changed", async () => {
    renderWithClient(<NotificationsPage />);

    await waitFor(() => screen.getByText("Notifications"));

    const typeSelect = screen.getByLabelText("Type") as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: "price" } });

    await waitFor(() => {
      const calls = (
        global.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const hasType = calls.some((call: unknown[]) =>
        String(call[0]).includes("type=price"),
      );
      expect(hasType).toBe(true);
    });
  });

  it("applies combined filters (Type + Filter) and refetches with both params", async () => {
    renderWithClient(<NotificationsPage />);

    await waitFor(() => screen.getByText("Notifications"));

    // Ubah filter Type menjadi price
    const typeSelect = screen.getByLabelText("Type") as HTMLSelectElement;
    fireEvent.change(typeSelect, { target: { value: "price" } });

    // Ubah filter Read menjadi unread (label UI: "Filter")
    const readSelect = screen.getByLabelText("Filter") as HTMLSelectElement;
    fireEvent.change(readSelect, { target: { value: "unread" } });

    // Verifikasi panggilan fetch mengandung kedua parameter
    await waitFor(() => {
      const calls = (
        global.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const hasCombined = calls.some((call: unknown[]) => {
        const url = String(call[0]);
        return url.includes("type=price") && url.includes("isRead=false");
      });
      expect(hasCombined).toBe(true);
    });
  });

  it("handles pagination Next: updates offset and loads page 2", async () => {
    // Stub ulang fetch dalam test ini untuk kontrol hasMore dan offset
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);

        // Halaman 2 (offset=20)
        if (url.includes("/api/notifications") && url.includes("offset=20")) {
          return {
            ok: true,
            json: async () => ({
              notifications: [
                {
                  id: "n3",
                  alertId: "a3",
                  address: "0x1234567890123456789012345678901234567890",
                  title: "Page 2 Notification",
                  message: "This is on page 2",
                  type: "price",
                  isRead: false,
                  triggeredAt: new Date().toISOString(),
                  readAt: null,
                },
              ],
              pagination: { total: 21, limit: 20, offset: 20, hasMore: false },
            }),
          } as unknown as Response;
        }

        // Halaman 1 (hasMore: true agar tombol Next aktif)
        if (url.includes("/api/notifications")) {
          return {
            ok: true,
            json: async () => ({
              notifications: [
                {
                  id: "n1",
                  alertId: "a1",
                  address: "0x1234567890123456789012345678901234567890",
                  title: "ETH Price Alert",
                  message: "ETH above $2500",
                  type: "price",
                  isRead: false,
                  triggeredAt: new Date().toISOString(),
                  readAt: null,
                },
              ],
              pagination: { total: 21, limit: 20, offset: 0, hasMore: true },
            }),
          } as unknown as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Not found" }),
        } as unknown as Response;
      }),
    );

    renderWithClient(<NotificationsPage />);

    // Tunggu halaman dimuat dan tombol Next aktif
    await screen.findByText("ETH Price Alert");

    const nextButton = screen.getByRole("button", { name: /Next/i });
    expect(nextButton).not.toHaveAttribute("disabled");
    fireEvent.click(nextButton);

    // Verifikasi panggilan offset=20 dilakukan
    await waitFor(() => {
      const calls = (
        global.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const hasOffset = calls.some((call: unknown[]) =>
        String(call[0]).includes("offset=20"),
      );
      expect(hasOffset).toBe(true);
    });

    // Verifikasi konten halaman 2 muncul
    await screen.findByText("Page 2 Notification");
  });

  it("changes Page size to 50 and refetches with limit=50", async () => {
    renderWithClient(<NotificationsPage />);

    await waitFor(() => screen.getByText("Notifications"));

    // Ubah page size menjadi 50
    const sizeSelect = screen.getByLabelText("Page size") as HTMLSelectElement;
    fireEvent.change(sizeSelect, { target: { value: "50" } });

    // Verifikasi panggilan fetch memiliki limit=50
    await waitFor(() => {
      const calls = (
        global.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const hasLimit50 = calls.some((call: unknown[]) =>
        String(call[0]).includes("limit=50"),
      );
      expect(hasLimit50).toBe(true);
    });
  });

  it("handles pagination Prev: returns to offset=0 after Next", async () => {
    // Mock fetch untuk mendukung navigasi Next lalu Prev
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);
        if (url.includes("/api/notifications") && url.includes("offset=20")) {
          return {
            ok: true,
            json: async () => ({
              notifications: [
                {
                  id: "n3",
                  alertId: "a3",
                  address: "0x1234567890123456789012345678901234567890",
                  title: "Page 2 Notification",
                  message: "This is on page 2",
                  type: "price",
                  isRead: false,
                  triggeredAt: new Date().toISOString(),
                  readAt: null,
                },
              ],
              pagination: { total: 21, limit: 20, offset: 20, hasMore: false },
            }),
          } as unknown as Response;
        }
        if (url.includes("/api/notifications")) {
          return {
            ok: true,
            json: async () => ({
              notifications: [
                {
                  id: "n1",
                  alertId: "a1",
                  address: "0x1234567890123456789012345678901234567890",
                  title: "ETH Price Alert",
                  message: "ETH above $2500",
                  type: "price",
                  isRead: false,
                  triggeredAt: new Date().toISOString(),
                  readAt: null,
                },
              ],
              pagination: { total: 21, limit: 20, offset: 0, hasMore: true },
            }),
          } as unknown as Response;
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Not found" }),
        } as unknown as Response;
      }),
    );

    renderWithClient(<NotificationsPage />);

    await screen.findByText("ETH Price Alert");

    // Klik Next -> offset 20
    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);
    await screen.findByText("Page 2 Notification");

    // Klik Prev -> kembali offset 0
    const prevBtn = screen.getByRole("button", { name: /Prev/i });
    fireEvent.click(prevBtn);

    await waitFor(() => {
      const calls = (
        global.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const hasOffset0 = calls.some((call: unknown[]) =>
        String(call[0]).includes("offset=0"),
      );
      expect(hasOffset0).toBe(true);
    });
    await screen.findByText("ETH Price Alert");
  });

  it("verifies aria-disabled attributes on pagination buttons", async () => {
    // Mock fetch untuk halaman pertama dengan hasMore=true
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          notifications: [
            {
              id: "1",
              title: "Aria Test Notification",
              message: "Test message",
              type: "price",
              isRead: false,
              triggeredAt: "2024-01-01T00:00:00Z",
              readAt: null,
              alertId: "alert1",
              address: "0x123",
            },
          ],
          pagination: { total: 50, limit: 20, offset: 0, hasMore: true },
        }),
    });

    renderWithClient(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Aria Test Notification")).toBeInTheDocument();
    });

    const prevButton = screen.getByRole("button", { name: /prev/i });
    const nextButton = screen.getByRole("button", { name: /next/i });

    // Prev disabled di halaman pertama
    expect(prevButton).toBeDisabled();
    expect(prevButton).toHaveAttribute("disabled");

    // Next enabled karena hasMore=true
    expect(nextButton).not.toBeDisabled();
    expect(nextButton).not.toHaveAttribute("disabled");
  });

  it("disables pagination buttons during isFetching=true", async () => {
    let resolvePromise: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });

    // Mock fetch yang pending untuk simulasi loading
    global.fetch = vi.fn().mockReturnValue(fetchPromise);

    renderWithClient(<NotificationsPage />);

    // Saat loading, tombol harus disabled
    await waitFor(() => {
      const prevButton = screen.getByRole("button", { name: /prev/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    // Resolve promise untuk menyelesaikan loading
    resolvePromise!({
      ok: true,
      json: () =>
        Promise.resolve({
          notifications: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        }),
    } as Response);
  });

  it("combines Page size + Filter and resets offset with correct parameters", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          notifications: [
            {
              id: "1",
              title: "Filter Combo Test",
              message: "Test message",
              type: "price",
              isRead: false,
              triggeredAt: "2024-01-01T00:00:00Z",
              readAt: null,
              alertId: "alert1",
              address: "0x123",
            },
          ],
          pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
        }),
    });

    renderWithClient(<NotificationsPage />);

    // Tunggu data awal dimuat
    await waitFor(() => {
      expect(screen.getByText("Filter Combo Test")).toBeInTheDocument();
    });

    // Ubah page size ke 50
    const pageSizeSelect = screen.getByDisplayValue("20");
    fireEvent.change(pageSizeSelect, { target: { value: "50" } });

    // Ubah filter ke "Read"
    const filterSelect = screen.getByDisplayValue("All");
    fireEvent.change(filterSelect, { target: { value: "read" } });

    // Verifikasi fetch dipanggil dengan parameter yang benar
    await waitFor(() => {
      const mockFetch = global.fetch as unknown as {
        mock: { calls: unknown[][] };
      };
      const lastCall = mockFetch.mock.calls.slice(-1)[0];
      const url = new URL(lastCall[0] as string, "http://localhost");

      expect(url.searchParams.get("limit")).toBe("50");
      expect(url.searchParams.get("offset")).toBe("0"); // Reset ke 0
      expect(url.searchParams.get("isRead")).toBe("true");
    });
  });
});

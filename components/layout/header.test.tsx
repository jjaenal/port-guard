import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./header";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => <div data-testid="connect-button">Connect</div>,
}));

describe("Header notifications dropdown", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);
        if (
          url.includes("/api/notifications") &&
          url.includes("isRead=false")
        ) {
          return {
            ok: true,
            json: async () => ({ pagination: { total: 2 } }),
          } as unknown as Response;
        }
        if (
          url.includes("/api/notifications") &&
          !url.includes("isRead=false")
        ) {
          return {
            ok: true,
            json: async () => ({
              notifications: [
                {
                  id: "n1",
                  title: "ETH Price Alert",
                  message: "ETH above $2500",
                  triggeredAt: new Date().toISOString(),
                  alert: { tokenSymbol: "ETH" },
                },
                {
                  id: "n2",
                  title: "Portfolio Change",
                  message: "Portfolio up 5%",
                  triggeredAt: new Date().toISOString(),
                  alert: { tokenSymbol: null },
                },
              ],
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

  it("opens dropdown and shows latest notifications", async () => {
    renderWithClient(<Header />);

    const bell = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(bell);

    await screen.findByText(/Latest notifications/i);
    await screen.findByText(/ETH Price Alert/i);
    await screen.findByText(/Portfolio Change/i);
  });

  it("closes dropdown when clicking 'View all' link", async () => {
    renderWithClient(<Header />);

    const bell = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(bell);

    await screen.findByText(/Latest notifications/i);

    const viewAll = screen.getByRole("link", { name: /View all/i });
    fireEvent.click(viewAll);

    await waitFor(() => {
      expect(
        screen.queryByText(/Latest notifications/i),
      ).not.toBeInTheDocument();
    });
  });

  it("deep-links to Analytics when clicking token-based notification and closes dropdown", async () => {
    renderWithClient(<Header />);

    const bell = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(bell);

    await screen.findByText(/Latest notifications/i);

    // Cari notifikasi dengan tokenSymbol (ETH) -> harus berupa tautan ke Analytics
    const notificationItem = await screen.findByText(/ETH Price Alert/i);
    const notificationLink = notificationItem.closest("a");
    expect(notificationLink).toBeInTheDocument();

    if (notificationLink) {
      // Verifikasi href mengarah ke analytics dengan simbol
      expect(notificationLink.getAttribute("href")).toContain(
        "/analytics?symbol=ETH",
      );
      // Klik link harus menutup dropdown (onClick memanggil setOpen(false))
      fireEvent.click(notificationLink);
      await waitFor(() => {
        expect(
          screen.queryByText(/Latest notifications/i),
        ).not.toBeInTheDocument();
      });
    }
  });

  it("closes dropdown when clicking outside", async () => {
    renderWithClient(<Header />);

    const bell = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(bell);

    await screen.findByText(/Latest notifications/i);

    // Click outside the dropdown (on the body)
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(
        screen.queryByText(/Latest notifications/i),
      ).not.toBeInTheDocument();
    });
  });

  it("closes dropdown when pressing ESC key", async () => {
    renderWithClient(<Header />);

    const bell = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(bell);

    await screen.findByText(/Latest notifications/i);

    // Press ESC key
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByText(/Latest notifications/i),
      ).not.toBeInTheDocument();
    });
  });

  it("shows loading then renders items in dropdown", async () => {
    // Mock fetch dengan delay untuk recent notifications agar memicu state loading
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);
        if (
          url.includes("/api/notifications") &&
          url.includes("isRead=false")
        ) {
          // Unread count (cepat)
          return {
            ok: true,
            json: async () => ({ pagination: { total: 1 } }),
          } as unknown as Response;
        }
        if (url.includes("/api/notifications")) {
          // Delay untuk memunculkan "Loading..." di dropdown
          await new Promise((r) => setTimeout(r, 50));
          return {
            ok: true,
            json: async () => ({
              notifications: [
                {
                  id: "n1",
                  title: "ETH Price Alert",
                  message: "ETH above $2500",
                  triggeredAt: new Date().toISOString(),
                  alert: { tokenSymbol: "ETH" },
                },
              ],
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

    renderWithClient(<Header />);

    const bell = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(bell);

    // Saat loading, teks "Loading..." harus tampil
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

    // Setelah data tiba, item harus tampil dan "Loading..." hilang
    await screen.findByText(/ETH Price Alert/i);
    expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
  });

  it("shows 'No notifications' when recent list is empty", async () => {
    // Mock fetch agar daftar recent kosong
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);
        if (
          url.includes("/api/notifications") &&
          url.includes("isRead=false")
        ) {
          return {
            ok: true,
            json: async () => ({ pagination: { total: 0 } }),
          } as unknown as Response;
        }
        if (url.includes("/api/notifications")) {
          return {
            ok: true,
            json: async () => ({ notifications: [] }),
          } as unknown as Response;
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Not found" }),
        } as unknown as Response;
      }),
    );

    renderWithClient(<Header />);

    const bell = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(bell);

    await screen.findByText(/Latest notifications/i);
    expect(await screen.findByText(/No notifications/i)).toBeInTheDocument();
  });
});

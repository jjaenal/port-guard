import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePushNotifications } from "./usePushNotifications";

// Mock wagmi useAccount untuk menyediakan address
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234567890123456789012345678901234567890" }),
}));

// Mock sonner toast agar tidak melempar ke DOM
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("usePushNotifications", () => {
  // Helper untuk set global tanpa 'any'
  const setGlobal = <T,>(key: string, value: T) => {
    (globalThis as Record<string, unknown>)[key] = value as unknown;
  };

  // Tipe ringan untuk mock DOM
  type NotificationLike = {
    permission: NotificationPermission;
    requestPermission: () => Promise<NotificationPermission>;
  };
  type PushManagerLike = {
    getSubscription: () => Promise<unknown>;
    subscribe: (options: unknown) => Promise<unknown>;
  };
  type ServiceWorkerRegistrationLike = {
    pushManager: PushManagerLike;
  };
  type NavigatorLike = {
    serviceWorker: { ready: Promise<ServiceWorkerRegistrationLike> };
  };

  const setupSupportedEnv = (opts?: {
    permission?: NotificationPermission;
    requestPermissionResult?: NotificationPermission;
    getSubscription?: unknown;
    subscribeResult?: unknown;
  }) => {
    // Siapkan API Notification
    const notification: NotificationLike = {
      permission: opts?.permission ?? "granted",
      requestPermission: vi.fn(async () => opts?.requestPermissionResult ?? "granted"),
    };
    setGlobal("Notification", notification);

    // Tandai PushManager tersedia
    setGlobal("PushManager", function () {});

    // Mock service worker registration
    const registration: ServiceWorkerRegistrationLike = {
      pushManager: {
        getSubscription: vi.fn(async () => opts?.getSubscription ?? null),
        subscribe: vi.fn(async () =>
          opts?.subscribeResult ?? {
            toJSON: () => ({
              endpoint: "https://example.com/endpoint",
              keys: { p256dh: "p", auth: "a" },
            }),
          },
        ),
      },
    };
    const navigatorMock: NavigatorLike = {
      serviceWorker: { ready: Promise.resolve(registration) },
    };
    setGlobal("navigator", navigatorMock);
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    // Hapus dukungan agar test bisa mengaktifkan sesuai skenario
    delete (globalThis as Record<string, unknown>).Notification;
    delete (globalThis as Record<string, unknown>).PushManager;
    setGlobal("navigator", {});
    // Env VAPID default
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    // Mock fetch default sukses
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    setGlobal("fetch", fetchMock as unknown as typeof fetch);
  });

  it("melaporkan isSupported=false jika API tidak tersedia", () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(false);
  });

  it("melaporkan isSupported=true di lingkungan yang didukung", () => {
    setupSupportedEnv();
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);
  });

  it("tidak berlangganan ketika permission ditolak", async () => {
    setupSupportedEnv({ permission: "default", requestPermissionResult: "denied" });
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    // fetch tidak dipanggil karena tidak subscribe
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("gagal ketika VAPID key tidak dikonfigurasi", async () => {
    setupSupportedEnv();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "";
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("berhasil subscribe dan menyimpan ke server", async () => {
    setupSupportedEnv({ permission: "granted" });
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.isSubscribed).toBe(true);
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("berhasil unsubscribe dan menghapus dari server", async () => {
    const fakeSub = { unsubscribe: vi.fn(async () => {}), toJSON: vi.fn(() => ({})) };
    setupSupportedEnv({ getSubscription: fakeSub });
    const { result } = renderHook(() => usePushNotifications());

    // Pastikan status awal: ada subscription
    await act(async () => {
      // panggil check via subscribe untuk set flag true (alternatif: panggil subscribe di atas)
      await result.current.unsubscribe();
    });

    expect(result.current.isSubscribed).toBe(false);
    expect(fakeSub.unsubscribe).toHaveBeenCalled();
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.stringContaining("/api/push/subscribe?address="),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("should handle error state and clearError", async () => {
    setupSupportedEnv({
      permission: "denied",
      requestPermissionResult: "denied",
    });

    const { result } = renderHook(() => usePushNotifications());

    // Awalnya tidak ada error
    expect(result.current.error).toBeNull();

    // Subscribe dengan permission denied
    await act(async () => {
      await result.current.subscribe();
    });

    // Harus ada error
    expect(result.current.error).toBe("Izin notifikasi ditolak. Aktifkan di pengaturan browser.");

    // Clear error
    act(() => {
      result.current.clearError();
    });

    // Error harus hilang
    expect(result.current.error).toBeNull();
  });

  it("should handle network error during subscribe", async () => {
    setupSupportedEnv({
      permission: "granted",
      subscribeResult: { toJSON: () => ({ endpoint: "test", keys: { p256dh: "test", auth: "test" } }) },
    });

    // Mock fetch untuk network error
    setGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe("Koneksi internet bermasalah. Periksa jaringan Anda.");
  });

  it("should handle rate limit error (429)", async () => {
    setupSupportedEnv({
      permission: "granted",
      subscribeResult: { 
        toJSON: () => ({ endpoint: "test", keys: { p256dh: "test", auth: "test" } }),
        unsubscribe: vi.fn()
      },
    });

    // Mock fetch untuk rate limit
    setGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 429 })));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe("Terlalu banyak permintaan. Coba lagi dalam beberapa menit.");
  });

  it("should handle server error (500)", async () => {
    setupSupportedEnv({
      permission: "granted",
      subscribeResult: { 
        toJSON: () => ({ endpoint: "test", keys: { p256dh: "test", auth: "test" } }),
        unsubscribe: vi.fn()
      },
    });

    // Mock fetch untuk server error
    setGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 500 })));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBe("Server sedang bermasalah. Coba lagi nanti.");
  });

  it("should handle sendTestNotification errors", async () => {
    setupSupportedEnv({ permission: "granted" });

    const { result } = renderHook(() => usePushNotifications());

    // Test 404 error (subscription not found)
    setGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 404 })));

    await act(async () => {
      await result.current.sendTestNotification();
    });

    expect(result.current.error).toBe("Subscription tidak ditemukan. Coba subscribe ulang.");

    // Clear error dan test 429 (rate limit)
    act(() => {
      result.current.clearError();
    });

    setGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 429 })));

    await act(async () => {
      await result.current.sendTestNotification();
    });

    expect(result.current.error).toBe("Terlalu banyak notifikasi. Coba lagi nanti.");
  });

  it("should clear error before new operations", async () => {
    setupSupportedEnv({
      permission: "denied",
      requestPermissionResult: "denied",
    });

    const { result } = renderHook(() => usePushNotifications());

    // Subscribe dengan error
    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBeTruthy();

    // Setup untuk operasi yang berhasil
    setupSupportedEnv({
      permission: "granted",
      subscribeResult: { 
        toJSON: () => ({ endpoint: "test", keys: { p256dh: "test", auth: "test" } })
      },
    });
    setGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));

    // Subscribe lagi - error harus di-clear otomatis
    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.error).toBeNull();
  });
});
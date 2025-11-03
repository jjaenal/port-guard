"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Moon, Sun, Wallet, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { UseQueryResult } from "@tanstack/react-query";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { address } = useAccount();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  // Ref untuk mendeteksi klik di luar dropdown
  const dropdownRootRef = useRef<HTMLDivElement | null>(null);

  // Tutup dropdown ketika klik di luar atau tekan ESC
  useEffect(() => {
    if (!open) return;

    // Handler klik di luar
    const onDocMouseDown = (e: MouseEvent) => {
      const root = dropdownRootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return; // klik di dalam, abaikan
      setOpen(false);
    };

    // Handler ESC
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  type UnreadResponse = {
    pagination: { total: number };
  };

  const unreadQuery: UseQueryResult<UnreadResponse, Error> = useQuery<
    UnreadResponse,
    Error
  >({
    queryKey: ["notifications-unread", address?.toLowerCase()],
    enabled: Boolean(address),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("address", address!.toLowerCase());
      params.set("isRead", "false");
      params.set("limit", "1");
      params.set("offset", "0");
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to fetch unread count (${res.status})`,
        );
      }
      return res.json();
    },
    staleTime: 30_000,
  });

  const unreadCount = unreadQuery.data?.pagination.total ?? 0;

  type NotificationItem = {
    id: string;
    title: string;
    message: string;
    triggeredAt: string;
    alert?: { tokenSymbol?: string | null };
  };

  type RecentResponse = {
    notifications: NotificationItem[];
  };

  const recentQuery: UseQueryResult<RecentResponse, Error> = useQuery<
    RecentResponse,
    Error
  >({
    queryKey: ["notifications-recent", address?.toLowerCase()],
    enabled: Boolean(address),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("address", address!.toLowerCase());
      params.set("limit", "5");
      params.set("offset", "0");
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to fetch recent notifications (${res.status})`,
        );
      }
      return res.json();
    },
    staleTime: 30_000,
  });

  // Hook untuk menampilkan browser notification ketika ada notifikasi baru
  useEffect(() => {
    // Hanya jalankan jika ada address dan browser mendukung Notification API
    if (
      !address ||
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    // Cek apakah izin sudah diberikan
    if (Notification.permission !== "granted") {
      return;
    }

    // Ambil data notifikasi terbaru
    const latestNotifications = recentQuery.data?.notifications;
    if (!latestNotifications || latestNotifications.length === 0) {
      return;
    }

    // Ambil notifikasi pertama (terbaru) untuk ditampilkan
    const latestNotification = latestNotifications[0];

    // Cek apakah ini notifikasi baru (dalam 1 menit terakhir)
    const triggeredTime = new Date(latestNotification.triggeredAt).getTime();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    if (triggeredTime > oneMinuteAgo) {
      // Tampilkan browser notification
      const notification = new Notification(latestNotification.title, {
        body: latestNotification.message,
        icon: "/favicon.ico",
        tag: latestNotification.id, // Prevent duplicate notifications
        requireInteraction: false,
      });

      // Auto close setelah 5 detik
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle klik notifikasi - buka halaman notifications
      notification.onclick = () => {
        window.focus();
        window.location.href = "/notifications";
        notification.close();
      };
    }
  }, [address, recentQuery.data?.notifications]);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <Wallet className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">PortGuard</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/analytics"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Analytics
            </Link>
            <Link
              href="/alerts"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Alerts
            </Link>
            <Link
              href="/defi/lido"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Lido
            </Link>
          </nav>

          <div
            className="flex items-center space-x-2 relative"
            ref={dropdownRootRef}
          >
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] h-4 min-w-[16px] px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
              {open && (
                <div className="absolute right-0 mt-2 w-80 rounded border bg-background shadow-md z-50">
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Latest notifications
                      </span>
                      <Link
                        href="/notifications"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setOpen(false)}
                      >
                        View all
                      </Link>
                    </div>
                    {recentQuery.isLoading && (
                      <div className="text-sm text-muted-foreground">
                        Loading...
                      </div>
                    )}
                    {!recentQuery.isLoading &&
                      (recentQuery.data?.notifications?.length ?? 0) === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No notifications
                        </div>
                      )}
                    <ul className="space-y-2">
                      {recentQuery.data?.notifications?.map((n) => (
                        <li key={n.id} className="text-sm">
                          {n.alert?.tokenSymbol ? (
                            <Link
                              href={`/analytics?symbol=${encodeURIComponent(n.alert.tokenSymbol)}`}
                              className="text-blue-600 hover:underline"
                              onClick={() => setOpen(false)}
                            >
                              {n.title}
                            </Link>
                          ) : (
                            <span className="font-medium">{n.title}</span>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(n.triggeredAt).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Komentar (ID): Link ke halaman Profile jika sudah terautentikasi */}
            {session ? (
              <Link href="/profile" className="text-sm text-blue-600 hover:underline">
                Profile
              </Link>
            ) : (
              // Komentar (ID): Tampilkan tombol Sign In jika belum terautentikasi
              <Link href="/auth/signin">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}

            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

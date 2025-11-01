"use client";

import { useEffect, useState } from "react";

type PermissionState = NotificationPermission | "unsupported";

/**
 * Badge kecil untuk menampilkan status izin notifikasi browser.
 *
 * Ditampilkan di header card Notifications sebagai indikator cepat.
 * - Diizinkan (hijau)
 * - Ditolak (merah)
 * - Belum diminta (abu-abu)
 * - Tidak didukung (abu-abu)
 */
export function PermissionBadge() {
  // Inisialisasi status dari lingkungan browser untuk menghindari setState sinkron di effect
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof window === "undefined") return "default";
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  // Berlangganan perubahan izin jika API Permissions tersedia
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Beberapa browser belum mendukung Permissions API untuk notifications
    try {
      const perms = (
        navigator as unknown as {
          permissions?: {
            query?: (desc: { name: unknown }) => Promise<unknown>;
          };
        }
      ).permissions;
      const query = perms?.query;
      if (!query) return;

      // Daftarkan handler perubahan izin; gunakan cleanup yang dikembalikan dari effect
      const handler = () => {
        if (!("Notification" in window)) {
          setPermission("unsupported");
          return;
        }
        setPermission(Notification.permission);
      };

      let cleanup: (() => void) | undefined;
      query({ name: "notifications" })
        .then((status) => {
          const target = status as EventTarget;
          const listener: EventListener = () => handler();
          target.addEventListener("change", listener);
          cleanup = () => target.removeEventListener("change", listener);
        })
        .catch(() => {
          // Diamkan error agar lint tidak trigger no-console
        });

      return () => cleanup?.();
    } catch {
      // Abaikan jika tidak didukung
    }
  }, []);

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";
  const label =
    permission === "unsupported"
      ? "Notifikasi tidak didukung"
      : isGranted
        ? "Izin: Diizinkan"
        : isDenied
          ? "Izin: Ditolak"
          : "Izin: Belum diminta";

  const dotClass = isGranted
    ? "bg-green-500"
    : isDenied
      ? "bg-red-500"
      : "bg-gray-400";

  return (
    // Tooltip sederhana via atribut title untuk guidance cepat
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
      title={
        permission === "unsupported"
          ? "Browser Anda tidak mendukung notifikasi. Coba Chrome/Edge/Firefox."
          : isGranted
            ? "Notifikasi diizinkan. Anda akan menerima push di browser."
            : isDenied
              ? "Izin ditolak. Buka pengaturan browser untuk mengizinkan notifikasi."
              : "Izin belum diminta. Aktifkan 'Browser Push' untuk meminta izin."
      }
    >
      {/* Titik warna sebagai indikator visual cepat */}
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PermissionState = NotificationPermission | "unsupported";

interface BrowserPermissionProps {
  /** Menampilkan tombol uji notifikasi setelah izin diberikan */
  showTestButton?: boolean;
}

/**
 * Komponen izin notifikasi browser.
 *
 * Tanggung jawab:
 * - Memeriksa dukungan Notification API & Service Worker
 * - Meminta izin notifikasi dari pengguna
 * - Opsi untuk memicu notifikasi uji (menggunakan SW jika tersedia)
 *
 * Catatan: Ini hanya untuk notifikasi lokal (client-side). Push server
 * belum diintegrasikan. Dapat ditingkatkan kemudian.
 */
export function BrowserPermission({
  showTestButton = true,
}: BrowserPermissionProps) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [hasSW, setHasSW] = useState(false);
  const [requesting, setRequesting] = useState(false);
  // Ref untuk mencegah toast readiness tampil berulang kali
  const readinessToastShown = useRef(false);

  // Cek dukungan fitur saat mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    setHasSW("serviceWorker" in navigator);
  }, []);

  // Minta izin notifikasi
  const requestPermission = async () => {
    if (permission === "unsupported") return;
    try {
      setRequesting(true);
      const result = await Notification.requestPermission();
      setPermission(result);
    } finally {
      setRequesting(false);
    }
  };

  // Tampilkan notifikasi uji untuk verifikasi
  const showTestNotification = async () => {
    if (permission !== "granted") return;
    const title = "Browser notifications aktif";
    const options: NotificationOptions = {
      body: "Notifikasi uji: konfigurasi berhasil.",
      icon: "/icon.png",
      badge: "/icon.png",
    };

    try {
      // Jika service worker sudah terdaftar, gunakan showNotification agar tetap tampil saat tab tidak aktif
      if (hasSW) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && "showNotification" in reg) {
          reg.showNotification(title, options);
          return;
        }
      }
      // Fallback: gunakan Notification langsung di halaman
      // (Akan tampil hanya saat tab aktif)
      new Notification(title, options);
    } catch {
      // Diamkan error sesuai aturan lint (tidak log console)
    }
  };

  // Ketika izin berubah menjadi 'granted' dan Service Worker tersedia,
  // pastikan SW siap dan berikan feedback ramah ke pengguna.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasSW) return; // Jika tidak ada SW, tidak ada yang perlu dilakukan
    if (permission !== "granted") return;
    if (readinessToastShown.current) return;

    // Tunggu SW siap; jika sudah siap, tampilkan toast satu kali
    navigator.serviceWorker.ready
      .then(() => {
        readinessToastShown.current = true;
        toast.success("Notifikasi siap di browser", {
          description: "Service Worker terdaftar dan izin sudah diberikan.",
          id: "browser-notif-ready",
        });
      })
      .catch(() => {
        // Diamkan error agar tidak melanggar aturan lint (no-console)
      });
  }, [permission, hasSW]);

  const isEnabled = permission === "granted";
  const isBlocked = permission === "denied";

  return (
    <div className="space-y-2">
      {/* Status izin dalam bahasa Indonesia */}
      <p className="text-sm text-muted-foreground">
        {permission === "unsupported"
          ? "Browser tidak mendukung notifikasi."
          : isEnabled
            ? "Izin notifikasi: Diizinkan"
            : isBlocked
              ? "Izin notifikasi: Ditolak (ubah di pengaturan browser)"
              : "Izin notifikasi: Belum diminta"}
      </p>

      {/* Tombol minta izin */}
      {!isEnabled && permission !== "unsupported" && (
        <button
          type="button"
          onClick={requestPermission}
          disabled={requesting}
          className="inline-flex items-center rounded bg-blue-600 text-white px-3 py-1 text-sm disabled:opacity-60"
        >
          {requesting ? "Meminta izin..." : "Aktifkan notifikasi browser"}
        </button>
      )}

      {/* Tombol uji notifikasi setelah diizinkan */}
      {showTestButton && isEnabled && (
        <button
          type="button"
          onClick={showTestNotification}
          className="inline-flex items-center rounded border px-3 py-1 text-sm"
        >
          Kirim notifikasi uji
        </button>
      )}
    </div>
  );
}

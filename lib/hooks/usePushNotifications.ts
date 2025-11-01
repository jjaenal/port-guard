import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Tambahkan error state untuk UI feedback yang lebih baik
interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  error: string | null; // Error state untuk UI
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
  clearError: () => void; // Clear error state
}

/**
 * Util: Konversi VAPID public key (base64 URL-safe) menjadi Uint8Array
 * Diperlukan oleh PushManager.subscribe untuk field applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook: Kelola langganan Push Notifications
 * - Deteksi dukungan browser
 * - Subscribe / Unsubscribe
 * - Kirim notifikasi uji via API
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { address } = useAccount();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [error, setError] = useState<string | null>(null); // State untuk error

  // Inisialisasi: cek dukungan dan status permission
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Cek status subscription yang ada di browser
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported) return; // Early return agar tidak nested
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(existing));
    } catch (error) {
      // Komentar: kegagalan tidak fatal, hanya log agar debugging mudah
      console.warn("Gagal memeriksa status subscription:", error);
      setIsSubscribed(false);
    }
  }, [isSupported]);

  useEffect(() => {
    void checkSubscriptionStatus();
  }, [checkSubscriptionStatus, address]);

  // Subscribe ke push notifications dan simpan ke server
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = "Browser tidak mendukung Push Notifications";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null); // Clear error sebelum operasi baru
    
    try {
      // Cek izin notifikasi dulu
      if (permission !== "granted") {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          const errorMsg = "Izin notifikasi ditolak. Aktifkan di pengaturan browser.";
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        const errorMsg = "VAPID public key tidak dikonfigurasi";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      // Komentar: beberapa versi TypeScript/DOM mendefinisikan BufferSource
      // secara ketat ke ArrayBuffer. Gunakan .buffer agar tipe cocok.
      const appServerKey = urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });

      const json = sub.toJSON() as PushSubscriptionData;
      const addr = address?.toLowerCase();
      if (!addr) {
        // Komentar: jika tidak ada address, batalkan dan unsubscribe agar tidak ada data yatim
        await sub.unsubscribe();
        const errorMsg = "Wallet belum terhubung";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, subscription: json }),
      });

      if (!res.ok) {
        await sub.unsubscribe();
        
        // Error handling yang lebih spesifik berdasarkan status code
        let errorMsg = "Gagal menyimpan subscription ke server";
        if (res.status === 429) {
          errorMsg = "Terlalu banyak permintaan. Coba lagi dalam beberapa menit.";
        } else if (res.status === 400) {
          errorMsg = "Data subscription tidak valid. Periksa konfigurasi VAPID.";
        } else if (res.status >= 500) {
          errorMsg = "Server sedang bermasalah. Coba lagi nanti.";
        }
        
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setIsSubscribed(true);
      toast.success("Berlangganan notifikasi berhasil");
    } catch (error) {
      console.error("Error subscribe push:", error);
      
      // Error handling yang lebih spesifik untuk berbagai jenis error
      let errorMsg = "Terjadi kesalahan saat berlangganan";
      if (error instanceof Error) {
        if (error.name === "NotSupportedError") {
          errorMsg = "Browser tidak mendukung push notifications";
        } else if (error.name === "NotAllowedError") {
          errorMsg = "Izin notifikasi ditolak";
        } else if (error.name === "AbortError") {
          errorMsg = "Operasi dibatalkan. Coba lagi.";
        } else if (error.message.includes("network")) {
          errorMsg = "Koneksi internet bermasalah. Periksa jaringan Anda.";
        }
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [address, isSupported, permission]);

  // Unsubscribe dari push notifications dan hapus di server
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null); // Clear error sebelum operasi baru
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }

      if (address) {
        const res = await fetch(`/api/push/subscribe?address=${address.toLowerCase()}`, {
          method: "DELETE",
        });
        
        // Log error tapi jangan gagalkan operasi unsubscribe lokal
        if (!res.ok) {
          console.warn("Gagal hapus subscription di server, tapi unsubscribe lokal berhasil");
        }
      }

      setIsSubscribed(false);
      toast.success("Berhenti berlangganan notifikasi");
    } catch (error) {
      console.error("Error unsubscribe push:", error);
      
      let errorMsg = "Gagal berhenti berlangganan";
      if (error instanceof Error && error.message.includes("network")) {
        errorMsg = "Koneksi bermasalah, tapi unsubscribe lokal mungkin berhasil";
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [address, isSupported]);

  // Kirim notifikasi uji ke address saat ini
  const sendTestNotification = useCallback(async () => {
    const addr = address?.toLowerCase();
    if (!addr) {
      const errorMsg = "Hubungkan wallet untuk tes notifikasi";
      setError(errorMsg);
      toast.warning(errorMsg);
      return;
    }

    setError(null); // Clear error sebelum operasi baru
    
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Tes Notifikasi",
          message: "Ini adalah notifikasi percobaan",
          address: addr,
          url: "/dashboard",
        }),
      });

      if (res.ok) {
        toast.success("Notifikasi uji dikirim");
      } else {
        // Error handling yang lebih spesifik untuk API /push/send
        let errorMsg = "Gagal mengirim notifikasi uji";
        if (res.status === 404) {
          errorMsg = "Subscription tidak ditemukan. Coba subscribe ulang.";
        } else if (res.status === 429) {
          errorMsg = "Terlalu banyak notifikasi. Coba lagi nanti.";
        } else if (res.status === 400) {
          errorMsg = "Data notifikasi tidak valid";
        } else if (res.status >= 500) {
          errorMsg = "Server push notification bermasalah";
        }
        
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error mengirim notifikasi uji:", error);
      
      let errorMsg = "Terjadi kesalahan saat mengirim notifikasi uji";
      if (error instanceof Error && error.message.includes("network")) {
        errorMsg = "Koneksi internet bermasalah. Periksa jaringan Anda.";
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    }
  }, [address]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error, // Tambahkan error state ke return
    subscribe,
    unsubscribe,
    sendTestNotification,
    clearError, // Tambahkan clearError ke return
  };
}
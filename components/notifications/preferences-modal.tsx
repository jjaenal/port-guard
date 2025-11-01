"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { isPreferencesDirty } from "@/lib/utils/notifications";
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BrowserPermission } from "./browser-permission";
import { PermissionBadge } from "./permission-badge";
import type { NotificationPreferences } from "@/types/notifications";
import { toast } from "sonner";

interface PreferencesModalProps {
  initial: NotificationPreferences;
  onSave: (prefs: NotificationPreferences) => Promise<unknown> | unknown;
  loading?: boolean;
}

export function PreferencesModal({
  initial,
  onSave,
  loading,
}: PreferencesModalProps) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(initial);
  // Ref untuk memantau perubahan toggle browser agar hanya memicu saat transisi false -> true
  const prevBrowserEnabled = useRef<boolean>(initial.channels.browser);

  // Sinkronisasi state dengan props initial ketika data berubah
  useEffect(() => {
    setPreferences(initial);
  }, [initial]);

  // Reset form ke state awal ketika modal dibuka
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setPreferences(initial);
    }
    setOpen(newOpen);
  };

  // Hitung apakah ada perubahan dibanding nilai awal untuk mengaktifkan tombol Simpan
  // Hindari deep clone: lakukan perbandingan field terstruktur yang relevan.
  const isDirty = useMemo(
    () => isPreferencesDirty(preferences, initial),
    [preferences, initial],
  );

  const handleSave = async () => {
    // Gunakan toast.promise untuk optimistik feedback selama proses simpan
    try {
      await toast.promise(Promise.resolve(onSave(preferences)), {
        loading: "Menyimpan preferensi...",
        success: "Preferensi berhasil disimpan",
        error: "Gagal menyimpan preferensi",
      });
      setOpen(false); // Tutup modal setelah sukses
    } catch {
      // Error ditangani oleh toast di atas; tidak perlu console.log
    }
  };

  const handleCancel = () => {
    setPreferences(initial); // Reset ke state awal
    setOpen(false);
  };

  // Minta izin notifikasi browser secara otomatis saat channel browser diaktifkan
  // dan izin belum diberikan. Ini membantu menghindari keadaan preferensi aktif
  // namun izin browser belum ada.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nowEnabled = preferences.channels.browser && preferences.enabled;
    const wasEnabled = prevBrowserEnabled.current;
    prevBrowserEnabled.current = preferences.channels.browser;

    // Hanya minta izin saat transisi dari non-aktif ke aktif
    if (!wasEnabled && nowEnabled) {
      // Jika browser tidak mendukung Notification API, tampilkan info ramah
      if (!("Notification" in window)) {
        toast.info("Browser tidak mendukung notifikasi.", {
          description:
            "Silakan gunakan browser modern seperti Chrome/Edge/Firefox.",
          id: "browser-notif-unsupported",
        });
        return;
      }

      const current = Notification.permission;
      if (current === "granted") {
        toast.success("Notifikasi browser sudah diizinkan", {
          description: "Anda dapat menerima push dari halaman ini.",
          id: "browser-notif-granted",
        });
        return;
      }

      // Meminta izin; hasilnya bisa granted/denied/default
      Notification.requestPermission()
        .then((result) => {
          if (result === "granted") {
            toast.success("Izin notifikasi diberikan", {
              description: "Pengaturan channel browser aktif.",
              id: "browser-notif-request-granted",
            });
          } else if (result === "denied") {
            toast.error("Izin notifikasi ditolak", {
              description:
                "Aktifkan izin di pengaturan browser untuk menerima notifikasi.",
              id: "browser-notif-request-denied",
            });
          } else {
            toast.message("Izin notifikasi belum diputuskan", {
              description:
                "Anda dapat mengaktifkannya kapan saja dari modal ini.",
              id: "browser-notif-request-default",
            });
          }
        })
        .catch(() => {
          // Diamkan error; tampilkan feedback ramah
          toast.error("Gagal meminta izin notifikasi", {
            description: "Coba lagi atau cek pengaturan browser Anda.",
            id: "browser-notif-request-error",
          });
        });
    }
  }, [preferences.channels.browser, preferences.enabled]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Pengaturan Notifikasi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pengaturan Notifikasi</DialogTitle>
          <DialogDescription>
            Atur preferensi notifikasi Anda untuk mendapatkan update yang
            relevan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toggle global enable */}
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
                className="rounded border-gray-300"
              />
              <div>
                <div className="text-sm font-medium">Aktifkan Notifikasi</div>
                <div className="text-xs text-muted-foreground">
                  Master switch untuk semua notifikasi
                </div>
              </div>
            </label>
          </div>

          {/* Metode Notifikasi */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Metode Notifikasi</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.channels.email}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      channels: {
                        ...prev.channels,
                        email: e.target.checked,
                      },
                    }))
                  }
                  className="rounded border-gray-300"
                  disabled={!preferences.enabled}
                />
                <span className="text-sm">Email</span>
              </label>

              <div className="space-y-2">
                <label className="flex items-center justify-between gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.channels.browser}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        channels: {
                          ...prev.channels,
                          browser: e.target.checked,
                        },
                      }))
                    }
                    className="rounded border-gray-300"
                    disabled={!preferences.enabled}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-sm">Browser Push Notifications</span>
                    {/* Badge kecil sebagai indikator izin cepat di dalam modal */}
                    {preferences.enabled ? <PermissionBadge /> : null}
                  </div>
                </label>
                {/* Selalu tampilkan indikator izin agar status jelas, 
                    tombol uji hanya muncul jika channel browser diaktifkan */}
                <BrowserPermission
                  showTestButton={preferences.channels.browser}
                />
              </div>
            </div>
          </div>

          {/* Jenis Notifikasi */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Jenis Notifikasi</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.alerts.price}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      alerts: {
                        ...prev.alerts,
                        price: e.target.checked,
                      },
                    }))
                  }
                  className="rounded border-gray-300"
                  disabled={!preferences.enabled}
                />
                <div>
                  <div className="text-sm">Price Alerts</div>
                  <div className="text-xs text-muted-foreground">
                    Notifikasi ketika harga token mencapai target yang Anda set
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.alerts.portfolio}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      alerts: {
                        ...prev.alerts,
                        portfolio: e.target.checked,
                      },
                    }))
                  }
                  className="rounded border-gray-300"
                  disabled={!preferences.enabled}
                />
                <div>
                  <div className="text-sm">Portfolio Updates</div>
                  <div className="text-xs text-muted-foreground">
                    Update perubahan signifikan pada portfolio Anda
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.alerts.liquidation}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      alerts: {
                        ...prev.alerts,
                        liquidation: e.target.checked,
                      },
                    }))
                  }
                  className="rounded border-gray-300"
                  disabled={!preferences.enabled}
                />
                <div>
                  <div className="text-sm">Liquidation Alerts</div>
                  <div className="text-xs text-muted-foreground">
                    Peringatan risiko likuidasi posisi DeFi Anda
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Batal
          </Button>
          {/* Nonaktifkan Simpan bila tidak ada perubahan atau sedang loading */}
          <Button onClick={handleSave} disabled={loading || !isDirty}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

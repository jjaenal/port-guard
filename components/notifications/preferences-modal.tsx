"use client";

import { useState, useEffect } from "react";
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
import type { NotificationPreferences } from "@/types/notifications";

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

  const handleSave = async () => {
    try {
      await onSave(preferences);
      setOpen(false); // Tutup modal setelah berhasil
    } catch (error) {
      // Error sudah ditangani oleh hook di parent component
      console.error("Error saving preferences:", error);
    }
  };

  const handleCancel = () => {
    setPreferences(initial); // Reset ke state awal
    setOpen(false);
  };

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
                <label className="flex items-center space-x-3">
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
                  <span className="text-sm">Browser Push Notifications</span>
                </label>
                {preferences.channels.browser && <BrowserPermission />}
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
          <Button onClick={handleSave} disabled={loading}>
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

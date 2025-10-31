/**
 * Tipe preferensi notifikasi pengguna.
 *
 * Catatan: Sederhana untuk tahap awal. Bisa dikembangkan
 * (mis. threshold, schedule) di iterasi berikutnya.
 */
export type NotificationChannel = "email" | "browser";

export interface NotificationPreferences {
  /** Apakah notifikasi diaktifkan secara global */
  enabled: boolean;
  /** Channel yang diaktifkan */
  channels: {
    email: boolean;
    browser: boolean;
  };
  /** Jenis alert yang ingin diterima */
  alerts: {
    price: boolean;
    portfolio: boolean;
    liquidation: boolean;
  };
  /** Waktu update terakhir (unix ms) */
  updatedAt: number;
}

/**
 * Preferensi default jika belum diset oleh pengguna.
 */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  channels: { email: false, browser: true },
  alerts: { price: true, portfolio: true, liquidation: true },
  updatedAt: 0,
};

/**
 * Validasi payload preferences agar sesuai struktur dan tipe boolean.
 * Return payload yang telah dinormalisasi atau throw Error.
 */
export function validatePreferencesPayload(
  input: unknown,
): NotificationPreferences {
  // Early return untuk input tidak valid
  if (!input || typeof input !== "object") {
    throw new Error("Invalid preferences payload");
  }

  const obj = input as Partial<NotificationPreferences> & {
    channels?: Partial<NotificationPreferences["channels"]>;
    alerts?: Partial<NotificationPreferences["alerts"]>;
  };

  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : true;

  const channels = {
    email:
      typeof obj.channels?.email === "boolean" ? obj.channels!.email : false,
    browser:
      typeof obj.channels?.browser === "boolean" ? obj.channels!.browser : true,
  };

  const alerts = {
    price: typeof obj.alerts?.price === "boolean" ? obj.alerts!.price : true,
    portfolio:
      typeof obj.alerts?.portfolio === "boolean" ? obj.alerts!.portfolio : true,
    liquidation:
      typeof obj.alerts?.liquidation === "boolean"
        ? obj.alerts!.liquidation
        : true,
  };

  return {
    enabled,
    channels,
    alerts,
    updatedAt: Date.now(),
  };
}

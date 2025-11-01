import type { NotificationPreferences } from "@/types/notifications";

/**
 * Membandingkan dua objek preferensi notifikasi untuk mendeteksi perubahan.
 *
 * Hanya membandingkan field yang relevan dan menghindari deep clone.
 */
export function isPreferencesDirty(
  next: NotificationPreferences,
  initial: NotificationPreferences,
): boolean {
  if (next.enabled !== initial.enabled) return true;
  if (next.channels.email !== initial.channels.email) return true;
  if (next.channels.browser !== initial.channels.browser) return true;
  if (next.alerts.price !== initial.alerts.price) return true;
  if (next.alerts.portfolio !== initial.alerts.portfolio) return true;
  if (next.alerts.liquidation !== initial.alerts.liquidation) return true;
  return false;
}

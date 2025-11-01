"use client";

import type { FC } from "react";

type Props = {
  supported: boolean;
  subscribed: boolean;
  loading?: boolean;
};

/**
 * Badge kecil untuk menampilkan status langganan Push Notifications (server-driven).
 *
 * - Subscribed (hijau): browser sudah terdaftar dan server menyimpan subscription
 * - Not subscribed (abu-abu): belum berlangganan, atau telah di-unsubscribe
 * - Unsupported (merah): browser tidak mendukung Push API / Service Worker
 */
export const PushStatusBadge: FC<Props> = ({ supported, subscribed, loading }) => {
  // Tentukan label dan warna titik indikator
  const isUnsupported = !supported;
  const isSubscribed = supported && subscribed;
  const label = isUnsupported
    ? "Push: Tidak didukung"
    : isSubscribed
      ? "Push: Aktif"
      : "Push: Tidak aktif";

  const dotClass = isUnsupported
    ? "bg-red-500"
    : isSubscribed
      ? "bg-green-500"
      : "bg-gray-400";

  // Tooltip sederhana untuk edukasi cepat
  const title = isUnsupported
    ? "Browser Anda tidak mendukung Push Notifications. Coba Chrome/Edge/Firefox."
    : isSubscribed
      ? "Anda akan menerima web push dari server untuk notifikasi."
      : "Belum berlangganan push. Klik 'Enable Browser Push' untuk mengaktifkan.";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
      title={title}
      aria-live="polite"
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
      <span>
        {label}
        {loading ? " (… )" : ""}
      </span>
    </span>
  );
};
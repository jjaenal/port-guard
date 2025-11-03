"use client";

import { useEffect, useState } from "react";

// Komentar (ID): Tipe data profil user sesuai API /api/user/profile
interface UserWallet {
  address: string;
  label: string;
  isDefault: boolean;
}

interface UserPreferences {
  currency: string;
  notifications: boolean;
  theme: string;
}

interface UserProfile {
  address: string;
  connectedAt: string;
  preferences: UserPreferences;
  wallets: UserWallet[];
}

export default function ProfilePage() {
  const [data, setData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Komentar (ID): Ambil data profil dari API yang dilindungi oleh middleware auth
  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: res.statusText }));
          setError(body?.error ?? body?.message ?? "Gagal memuat profil");
          setIsLoading(false);
          return;
        }
        const json = (await res.json()) as { success: boolean; data: UserProfile };
        setData(json.data);
      } catch {
        setError("Terjadi kesalahan saat memuat profil");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, []);

  if (isLoading) {
    return <div className="container mx-auto p-6">Memuat profil…</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-red-600">Error: {error}</div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">Tidak ada data profil.</div>
    );
  }

  // Komentar (ID): Tampilkan ringkas info profil dan daftar dompet
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <div className="space-y-2">
        <div>
          <span className="font-medium">Alamat:</span> {data.address}
        </div>
        <div>
          <span className="font-medium">Terhubung Sejak:</span> {new Date(data.connectedAt).toLocaleString()}
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Preferensi</h2>
        <div>Currency: {data.preferences.currency}</div>
        <div>Notifikasi: {data.preferences.notifications ? "Aktif" : "Nonaktif"}</div>
        <div>Theme: {data.preferences.theme}</div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dompet</h2>
        <ul className="list-disc pl-6">
          {data.wallets.map((w) => (
            <li key={w.address}>
              {w.label} — {w.address} {w.isDefault ? "(Default)" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
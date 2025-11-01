import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, optimism } from "wagmi/chains";

const appName = "PortGuard";
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const wagmiConfig = getDefaultConfig({
  appName,
  projectId,
  // Tambah dukungan Optimism di konfigurasi Wagmi
  chains: [mainnet, polygon, optimism],
  ssr: true,
});
// Ekspor daftar chains yang didukung (termasuk Optimism)
export const chains = [mainnet, polygon, optimism];

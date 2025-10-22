import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon } from "wagmi/chains";

const appName = "PortGuard";
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const wagmiConfig = getDefaultConfig({
  appName,
  projectId,
  chains: [mainnet, polygon],
  ssr: true,
});

export const chains = [mainnet, polygon];

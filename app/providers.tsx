"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { wagmiConfig } from "../config/wagmi";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_TRACKING_ID, pageview } from "@/lib/analytics/gtag";
import { SwRegister } from "@/components/sw-register";
import { NetworkStatusToast } from "@/components/network-status-toast";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_TRACKING_ID) return;
    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    pageview(url);
  }, [pathname, searchParams]);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider>{children}</RainbowKitProvider>
          <SwRegister />
          <NetworkStatusToast />
        </WagmiProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

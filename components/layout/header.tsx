"use client";

import Link from "next/link";
import { Moon, Sun, Wallet, WifiOff } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);

    // Set initial state
    updateOnline();

    // Add event listeners
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    // Cleanup
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" href="/">
            <Wallet className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">PortGuard</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              prefetch={false}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/analytics"
              prefetch={false}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Analytics
            </Link>
          </nav>

          <div className="flex items-center space-x-2">
            {!isOnline && (
              <div className="flex items-center px-2 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

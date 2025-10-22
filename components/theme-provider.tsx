"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Hindari deep import: gunakan tipe dari komponen langsung
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Provider komponen untuk mengelola tema (light/dark mode)
 *
 * Menggunakan next-themes untuk manajemen tema dengan dukungan
 * untuk tema sistem, persistensi, dan toggle tema
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

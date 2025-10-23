"use client";

import Link from "next/link";

/**
 * Komponen Footer untuk layout aplikasi
 * Menampilkan informasi copyright dan link penting
 */
export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
        <p className="text-center text-sm text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} PortGuard Dashboard. All rights
          reserved.
        </p>
        <div className="flex gap-4">
          <Link
            href="/terms"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Privacy
          </Link>
          <Link
            href="/about"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Komentar (ID): Middleware untuk melindungi route yang memerlukan autentikasi
export default withAuth(
  function middleware(req) {
    // Komentar (ID): Jika user tidak terautentikasi, redirect ke sign-in
    if (!req.nextauth.token) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // Komentar (ID): Lanjutkan request jika sudah terautentikasi
    return NextResponse.next();
  },
  {
    callbacks: {
      // Komentar (ID): Tentukan apakah user diizinkan mengakses route
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Komentar (ID): Route publik yang tidak memerlukan autentikasi
        const publicRoutes = [
          "/",
          "/auth/signin",
          "/api/auth",
          "/api/health",
          "/api/prices",
          "/robots.txt",
          "/sitemap.xml",
        ];

        // Komentar (ID): Cek apakah route adalah publik atau dimulai dengan path publik
        const isPublicRoute = publicRoutes.some((route) =>
          pathname === route || pathname.startsWith(route + "/")
        );

        // Komentar (ID): Izinkan akses ke route publik tanpa token
        if (isPublicRoute) {
          return true;
        }

        // Komentar (ID): Route protected memerlukan token
        return !!token;
      },
    },
  }
);

// Komentar (ID): Konfigurasi matcher untuk menentukan route mana yang akan diproses middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
};
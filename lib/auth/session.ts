import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";

// Komentar (ID): Interface untuk session data yang diperluas dengan address
export interface ExtendedSession {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  address?: string;
  expires: string;
}

/**
 * Mendapatkan session dari server-side
 * Digunakan di API routes dan server components
 */
export async function getSession(): Promise<ExtendedSession | null> {
  try {
    const session = await getServerSession(authOptions);
    return session as ExtendedSession | null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Mendapatkan session dari request headers
 * Berguna untuk API routes yang menerima NextRequest
 */
export async function getSessionFromRequest(): Promise<ExtendedSession | null> {
  // Komentar (ID): Gunakan helper utama agar tidak duplikasi logika
  return getSession();
}

/**
 * Memverifikasi apakah user terautentikasi
 * Mengembalikan address jika valid, null jika tidak
 */
export async function requireAuth(): Promise<string | null> {
  const session = await getSession();
  
  if (!session || !session.address) {
    return null;
  }

  return session.address;
}

/**
 * Middleware helper untuk melindungi API routes
 * Mengembalikan response error jika tidak terautentikasi
 */
export async function withAuthGuard<T>(
  handler: (address: string) => Promise<T>
): Promise<T | Response> {
  const address = await requireAuth();
  
  if (!address) {
    return new Response(
      JSON.stringify({ 
        error: "Unauthorized", 
        message: "Authentication required" 
      }),
      { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }

  return handler(address);
}

/**
 * Utility untuk mengecek apakah address cocok dengan session
 * Berguna untuk validasi ownership
 */
export async function validateAddressOwnership(
  targetAddress: string
): Promise<boolean> {
  const session = await getSession();
  
  if (!session || !session.address) {
    return false;
  }

  // Komentar (ID): Normalisasi address untuk perbandingan (case-insensitive)
  return session.address.toLowerCase() === targetAddress.toLowerCase();
}
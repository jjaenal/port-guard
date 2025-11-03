import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";

/**
 * Setup NextAuth + SIWE (Sign-In with Ethereum) menggunakan CredentialsProvider.
 *
 * Komentar (ID):
 * - Provider ini mengharapkan `message` (SIWE message) dan `signature` dari klien.
 * - Verifikasi dilakukan server-side untuk memastikan signature valid dan domain cocok.
 * - Session menggunakan JWT agar ringan dan tidak perlu adapter database.
 * - Implementasi ini adalah dasar; UI sign-in dan nonce management bisa ditingkatkan berikutnya.
 */
const authOptions: NextAuthOptions = {
  // Komentar (ID): Gunakan JWT agar tidak tergantung DB untuk MVP
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: { label: "SIWE Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials, req) {
        // Validasi awal input
        const message = credentials?.message;
        const signature = credentials?.signature;
        if (!message || !signature) {
          // Komentar (ID): Kembalikan null agar NextAuth menangani sebagai gagal login
          return null;
        }

        try {
          // Komentar (ID): Verifikasi SIWE — pastikan domain cocok dan signature valid
          const siweMessage = new SiweMessage(message);
          const host = new URL(req.headers?.origin ?? req.headers?.referer ?? "http://localhost").host;

          const result = await siweMessage.verify({
            signature,
            domain: host,
          });

          if (result.success) {
            // Komentar (ID): Jika verifikasi sukses, kembalikan objek user minimal
            const address = siweMessage.address?.toLowerCase();
            if (!address) return null;
            return {
              id: address,
              address,
            } as unknown as { id: string };
          }
          return null;
        } catch {
          return null;
        }
      },
    }),
  ],
  // Komentar (ID): Callback untuk menaruh address on JWT & session
  callbacks: {
    async jwt({ token, user }) {
      if (user && (user as unknown as { address?: string }).address) {
        token.address = (user as unknown as { address: string }).address;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.address) {
        (session as unknown as { address?: string }).address = token.address as string;
      }
      return session;
    },
  },
};

// Komentar (ID): Ekspor route handler untuk Next.js App Router
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
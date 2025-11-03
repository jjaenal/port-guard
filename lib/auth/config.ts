import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";

// Komentar (ID): Konfigurasi NextAuth dengan SIWE (Sign-In with Ethereum)
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature", 
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) {
            return null;
          }

          // Komentar (ID): Parse dan verifikasi pesan SIWE
          const siwe = new SiweMessage(credentials.message);
          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000");

          // Komentar (ID): Validasi domain dan nonce
          if (siwe.domain !== nextAuthUrl.host) {
            return null;
          }

          // Komentar (ID): Verifikasi signature
          const result = await siwe.verify({
            signature: credentials.signature,
          });

          if (result.success) {
            return {
              id: siwe.address,
              address: siwe.address,
            };
          }

          return null;
        } catch (error) {
          console.error("SIWE verification error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Komentar (ID): Simpan address di JWT token
      if (user && 'address' in user) {
        token.address = user.address as string;
      }
      return token;
    },
    async session({ session, token }) {
      // Komentar (ID): Tambahkan address ke session object
      return {
        ...session,
        address: token.address as string,
      };
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
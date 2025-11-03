import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";

// Komentar (ID): Ekspor route handler untuk Next.js App Router
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
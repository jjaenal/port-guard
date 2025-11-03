"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SiweMessage } from "siwe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Halaman Sign-In dengan SIWE (Sign-In with Ethereum)
 * 
 * Komentar (ID):
 * - Menggunakan wagmi untuk koneksi wallet dan signing
 * - Integrasi dengan NextAuth untuk session management
 * - SIWE message dibuat client-side lalu diverifikasi server-side
 * - Redirect ke dashboard setelah berhasil login
 */
export default function SignInPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Komentar (ID): Cek session saat mount untuk redirect jika sudah login
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session && (session as unknown as { address?: string }).address) {
        setIsAuthenticated(true);
        // Redirect ke dashboard jika sudah login
        router.push("/dashboard");
      }
    };
    checkSession();
  }, [router]);

  // Komentar (ID): Handler untuk SIWE sign-in process
  const handleSiweSignIn = async () => {
    if (!address || !isConnected) {
      toast.error("Silakan hubungkan wallet terlebih dahulu");
      return;
    }

    setIsLoading(true);
    try {
      // Komentar (ID): Buat SIWE message dengan domain dan nonce
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = "Sign in to PortGuard Dashboard";
      
      const message = new SiweMessage({
        domain,
        address,
        statement,
        uri: origin,
        version: "1",
        chainId: 1, // Ethereum mainnet
        nonce: Math.random().toString(36).substring(2), // Simple nonce untuk demo
      });

      const messageString = message.prepareMessage();

      // Komentar (ID): Minta user sign message via wallet
      const signature = await signMessageAsync({
        message: messageString,
      });

      // Komentar (ID): Kirim ke NextAuth untuk verifikasi dan buat session
      const result = await signIn("credentials", {
        message: messageString,
        signature,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Gagal verifikasi signature");
        return;
      }

      if (result?.ok) {
        toast.success("Berhasil masuk!");
        setIsAuthenticated(true);
        
        // Komentar (ID): Redirect ke dashboard setelah berhasil
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("SIWE sign-in error:", error);
      toast.error("Gagal masuk. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Komentar (ID): Jika sudah authenticated, tampilkan status success
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Berhasil Masuk</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Anda akan diarahkan ke dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Masuk ke PortGuard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gunakan wallet Ethereum Anda untuk masuk dengan aman
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Komentar (ID): Step 1 - Connect Wallet */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                1
              </div>
              <span className="text-sm font-medium">Hubungkan Wallet</span>
            </div>
            
            <div className="ml-11">
              <ConnectButton />
            </div>
            
            {isConnected && (
              <div className="ml-11 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Wallet terhubung: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            )}
          </div>

          {/* Komentar (ID): Step 2 - Sign Message */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                isConnected 
                  ? "bg-blue-100 text-blue-600" 
                  : "bg-gray-100 text-gray-400"
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${
                isConnected ? "text-foreground" : "text-muted-foreground"
              }`}>
                Tanda Tangani Pesan
              </span>
            </div>
            
            <div className="ml-11">
              <Button
                onClick={handleSiweSignIn}
                disabled={!isConnected || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Masuk dengan Ethereum
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Komentar (ID): Info tentang SIWE */}
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  Aman & Terdesentralisasi
                </p>
                <p className="text-blue-700">
                  Kami menggunakan Sign-In with Ethereum (SIWE) untuk autentikasi yang aman tanpa menyimpan password.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
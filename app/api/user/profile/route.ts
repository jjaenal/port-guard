import { NextRequest, NextResponse } from "next/server";
import { withAuthGuard, getSession } from "@/lib/auth/session";

// Komentar (ID): Contoh API route yang dilindungi dengan authentication
export async function GET() {
  return withAuthGuard(async (address: string) => {
    try {
      // Komentar (ID): Dapatkan session lengkap untuk informasi tambahan
      const session = await getSession();
      
      // Komentar (ID): Simulasi data profil user (nanti bisa dari database)
      const userProfile = {
        address: address,
        connectedAt: session?.expires || new Date().toISOString(),
        // Komentar (ID): Data tambahan bisa ditambahkan sesuai kebutuhan
        preferences: {
          currency: "USD",
          notifications: true,
          theme: "light",
        },
        wallets: [
          {
            address: address,
            label: "Primary Wallet",
            isDefault: true,
          },
        ],
      };

      return NextResponse.json({
        success: true,
        data: userProfile,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to fetch user profile" 
        },
        { status: 500 }
      );
    }
  });
}

// Komentar (ID): Update profil user (contoh PUT endpoint yang dilindungi)
export async function PUT(request: NextRequest) {
  return withAuthGuard(async (address: string) => {
    try {
      const body = await request.json();
      
      // Komentar (ID): Validasi input
      const { preferences, wallets } = body;
      
      if (!preferences && !wallets) {
        return NextResponse.json(
          { 
            success: false, 
            error: "No valid fields to update" 
          },
          { status: 400 }
        );
      }

      // Komentar (ID): Simulasi update (nanti bisa ke database)
      const updatedProfile = {
        address: address,
        updatedAt: new Date().toISOString(),
        preferences: preferences || {
          currency: "USD",
          notifications: true,
          theme: "light",
        },
        wallets: wallets || [
          {
            address: address,
            label: "Primary Wallet",
            isDefault: true,
          },
        ],
      };

      return NextResponse.json({
        success: true,
        data: updatedProfile,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to update user profile" 
        },
        { status: 500 }
      );
    }
  });
}
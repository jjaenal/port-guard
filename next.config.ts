import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Komentar (ID): Gunakan distDir alternatif agar lockfile tidak bentrok
  distDir: ".next-alt",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@react-native-async-storage/async-storage"] =
      path.resolve(__dirname, "shims/async-storage.ts");
    return config;
  },
};

export default nextConfig;

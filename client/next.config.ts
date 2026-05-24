import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.up.railway.app",
        pathname: "/uploads/**",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "https://flexchat-app-production.up.railway.app/:path*",
      },
    ];
  },
};

export default nextConfig;

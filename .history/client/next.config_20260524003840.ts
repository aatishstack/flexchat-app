import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "https://flexchat-app-production.up.railway.app/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination:
          "https://flexchat-app-production.up.railway.app/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;

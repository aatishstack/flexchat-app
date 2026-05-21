import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  turbopack: {
    root: process.cwd(),
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-avatar",
      "@radix-ui/react-tooltip",
    ],
  },

  productionBrowserSourceMaps: false,

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  poweredByHeader: false,

  reactStrictMode: true,
};

export default nextConfig;

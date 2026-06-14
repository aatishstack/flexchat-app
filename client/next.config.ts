import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
  turbopack: {
    root: __dirname,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "flexchat",
  project: "client",
});

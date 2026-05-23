import type { Metadata } from "next";

import "./globals.css";

import AuthRouteGate from "@/components/auth/auth-route-gate";

import LiveToast from "@/components/chat/sidebar/live-toast";
import HttpsBanner from "@/components/shared/HttpsBanner";

import AuthProvider from "@/providers/auth-provider";

import QueryProvider from "@/providers/query-provider";
import ServerTimeProvider from "@/providers/server-time-provider";

import SocketProvider from "@/socket/socket-provider";
import GlobalThemeProvider from "@/components/theme/global-theme-provider";

export const metadata: Metadata = {
  title: "FlexChat",

  description:
    "Premium realtime messaging platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--fc-chat-bg)] text-[var(--fc-theme-text)] antialiased">
        <QueryProvider>
          <ServerTimeProvider>
            <SocketProvider>
              <AuthProvider>
                <GlobalThemeProvider>
                  <AuthRouteGate>
                    <HttpsBanner />
                    {children}
                  </AuthRouteGate>
                </GlobalThemeProvider>
                <LiveToast />
              </AuthProvider>
            </SocketProvider>
          </ServerTimeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

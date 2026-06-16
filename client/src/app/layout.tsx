import type { Metadata, Viewport } from "next";

import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

import AuthRouteGate from "@/components/auth/auth-route-gate";

import LiveToast from "@/components/chat/sidebar/live-toast";
import HttpsBanner from "@/components/shared/HttpsBanner";

import AuthProvider from "@/providers/auth-provider";

import QueryProvider from "@/providers/query-provider";
import ServerTimeProvider from "@/providers/server-time-provider";

import SocketProvider from "@/socket/socket-provider";
import GlobalThemeProvider from "@/components/theme/global-theme-provider";
import NotificationProvider from "@/providers/notification-provider";
import GlobalErrorBoundary from "@/components/shared/GlobalErrorBoundary";

export const metadata: Metadata = {
  title: "FlexChat",
  description: "Premium realtime messaging platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FlexChat",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#17212b" />
      </head>
      <body className={`${plusJakartaSans.variable} font-sans fc-theme-transition bg-[var(--fc-app-bg)] text-[var(--fc-theme-text)] antialiased`}>
        <GlobalErrorBoundary>
          <QueryProvider>
            <ServerTimeProvider>
              <SocketProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <GlobalThemeProvider>
                      <AuthRouteGate>
                        <HttpsBanner />
                        {children}
                      </AuthRouteGate>
                    </GlobalThemeProvider>
                  </NotificationProvider>
                  <LiveToast />
                </AuthProvider>
              </SocketProvider>
            </ServerTimeProvider>
          </QueryProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}

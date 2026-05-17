import type { Metadata } from "next";

import "./globals.css";

import AuthRouteGate from "@/components/auth/auth-route-gate";

import AuthProvider from "@/providers/auth-provider";

import QueryProvider from "@/providers/query-provider";

import SocketProvider from "@/socket/socket-provider";

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
      <body className="bg-[#070B14] text-white antialiased">
        <QueryProvider>
          <SocketProvider>
            <AuthProvider>
              <AuthRouteGate>
                {children}
              </AuthRouteGate>
            </AuthProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

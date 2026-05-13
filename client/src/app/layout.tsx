import type { Metadata } from "next";

import "./globals.css";

import AuthProvider from "@/providers/auth-provider";

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
        <SocketProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
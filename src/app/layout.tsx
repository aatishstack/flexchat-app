import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { SocketProvider } from "@/components/providers/socket-provider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlexChat",
  description: "Realtime Messaging App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
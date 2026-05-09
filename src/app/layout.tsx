import type { Metadata } from "next";

import "./globals.css";

import Providers from "@/components/shared/providers";

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
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>

        <Providers>
          {children}
        </Providers>

      </body>
    </html>
  );
}
"use client";

import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import PageTransition from "@/components/layout/PageTransition";

import AppLoader from "@/components/layout/AppLoader";

import LiveToasts from "@/components/layout/LiveToasts";

import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const timer =
      setTimeout(() => {

        setLoading(false);

      }, 2200);

    return () =>
      clearTimeout(timer);

  }, []);

  return (

    <html lang="en">

      <body className="overflow-hidden bg-[#050510] text-white antialiased">

        {/* SOFT PARTICLES */}

        <div className="pointer-events-none fixed inset-0 overflow-hidden">

          {[...Array(18)].map(
            (_, index) => (

              <motion.div
                key={index}
                animate={{
                  y: [
                    0,
                    -80,
                    0,
                  ],
                  x: [
                    0,
                    30,
                    0,
                  ],
                }}
                transition={{
                  duration:
                    10 +
                    index,
                  repeat:
                    Infinity,
                  ease:
                    "easeInOut",
                }}
                className="absolute rounded-full bg-cyan-400/10 blur-xl"
                style={{
                  width:
                    6 +
                    index * 2,
                  height:
                    6 +
                    index * 2,
                  left: `${(index * 5.2) % 100}%`,
                  top: `${(index * 7.4) % 100}%`,
                }}
              />
            )
          )}

        </div>

        {/* SUBTLE GRID */}

        <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:70px_70px]" />

        {/* STARTUP */}

        <AppLoader loading={loading} />

        {/* LIVE */}

        <LiveToasts />

        {/* APP */}

        <PageTransition>

          {children}

        </PageTransition>

      </body>

    </html>
  );
}
"use client";

import { useEffect, useState } from "react";

import PageTransition from "@/components/layout/PageTransition";

import AppLoader from "@/components/layout/AppLoader";

import CursorAura from "@/components/layout/CursorAura";

import HoloTrail from "@/components/layout/HoloTrail";

import LiveToasts from "@/components/layout/LiveToasts";

import ParticleStorm from "@/components/layout/ParticleStorm";

import LiquidGlass from "@/components/layout/LiquidGlass";

import EdgeLighting from "@/components/layout/EdgeLighting";

import AuroraLights from "@/components/layout/AuroraLights";

import CyberScanner from "@/components/layout/CyberScanner";

import AIOrb from "@/components/layout/AIOrb";

import ParallaxBackground from "@/components/layout/ParallaxBackground";

import MagneticButton from "@/components/ui/MagneticButton";

import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="en">
      <body className="overflow-hidden bg-[#050510] text-white antialiased">
        {/* BACKGROUND */}
        <AuroraLights />

        <ParallaxBackground />

        {/* FX */}
        <LiquidGlass />

        <ParticleStorm />

        <CyberScanner />

        <EdgeLighting />

        {/* CURSOR */}
        <HoloTrail />

        <CursorAura />

        {/* AI */}
        <AIOrb />

        {/* STARTUP */}
        <AppLoader loading={loading} />

        {/* LIVE */}
        <LiveToasts />

        {/* APP */}
        <PageTransition>
          {children}
        </PageTransition>

        {/* FLOAT */}
        
      </body>
    </html>
  );
}
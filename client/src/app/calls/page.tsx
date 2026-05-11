"use client";

import Link from "next/link";

import FlexDock from "@/components/navigation/FlexDock";

import {
  ArrowLeft,
  Phone,
  Video,
} from "lucide-react";

export default function CallsPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* HEADER */}
        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>

          <div>
            <h1 className="text-5xl font-black">
              Calls
            </h1>

            <p className="mt-2 text-white/45">
              Premium realtime communication
            </p>
          </div>
        </div>

        {/* CALL CARDS */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* VOICE */}
          <div className="rounded-[36px] border border-white/10 bg-white/[0.04] p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              <Phone className="h-10 w-10" />
            </div>

            <h2 className="mt-6 text-3xl font-black">
              Voice Calls
            </h2>

            <p className="mt-3 text-white/45">
              Crystal clear encrypted communication.
            </p>

            <button className="mt-8 w-full rounded-3xl bg-gradient-to-r from-purple-600 to-cyan-500 py-5 font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)]">
              Start Voice Call
            </button>
          </div>

          {/* VIDEO */}
          <div className="rounded-[36px] border border-white/10 bg-white/[0.04] p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-orange-500 shadow-[0_10px_40px_rgba(236,72,153,0.35)]">
              <Video className="h-10 w-10" />
            </div>

            <h2 className="mt-6 text-3xl font-black">
              Video Calls
            </h2>

            <p className="mt-3 text-white/45">
              Ultra HD realtime video experience.
            </p>

            <button className="mt-8 w-full rounded-3xl bg-gradient-to-r from-pink-500 to-orange-500 py-5 font-bold shadow-[0_10px_40px_rgba(236,72,153,0.35)]">
              Start Video Call
            </button>
          </div>
        </div>
      </div>

      <FlexDock />
    </main>
  );
}
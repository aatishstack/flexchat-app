"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  Smartphone,
} from "lucide-react";

import { motion } from "framer-motion";

import { useToastStore } from "@/store/toast-store";

export default function VerifyPage() {
  const router = useRouter();
  const pushToast =
    useToastStore(
      (state) => state.pushToast
    );
  const [code, setCode] =
    useState<string[]>(
      Array.from({ length: 6 }, () => "")
    );
  const canVerify =
    code.every(Boolean);

  function updateCode(
    index: number,
    value: string
  ) {
    const digit =
      value.replace(/\D/g, "").slice(-1);

    setCode((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? digit
          : item
      )
    );
  }

  function handleVerify() {
    if (!canVerify) {
      return;
    }

    pushToast({
      title:
        "Verification unavailable",
      message:
        "Phone verification is not enabled for this auth flow. Continue with email or Google sign-in.",
      variant: "info",
    });
    router.replace("/auth");
  }

  function handleResend() {
    pushToast({
      title:
        "Resend unavailable",
      message:
        "Use email/password or Google sign-in while phone verification is offline.",
      variant: "warning",
    });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-6 text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        {/* BLOBS */}
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
          }}
          className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-[120px]"
        />

        <motion.div
          animate={{
            x: [0, -60, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
          }}
          className="absolute bottom-[-120px] right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[120px]"
        />

        {/* GRID */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* CARD */}
      <motion.div
        initial={{
          opacity: 0,
          y: 40,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
        }}
        className="relative z-10 w-full max-w-md rounded-[40px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-3xl"
      >
        {/* BACK */}
        <Link
          href="/auth"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 transition-all hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />

          Back
        </Link>

        {/* ICON */}
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[30px] bg-gradient-to-br from-purple-600 to-blue-500 shadow-[0_10px_50px_rgba(139,92,246,0.45)]">
          <Smartphone className="h-10 w-10" />
        </div>

        {/* TITLE */}
        <div>
          <h1 className="text-4xl font-black">
            Verify Identity
          </h1>

          <p className="mt-4 leading-relaxed text-white/45">
            We sent a secure verification code to your
            registered device.
          </p>
        </div>

        {/* PHONE */}
        <div className="mt-8 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />

          <span className="text-sm text-white/65">
            +91 ***** **704
          </span>
        </div>

        {/* OTP */}
        <div className="mt-10 flex items-center justify-between gap-3">
          {[1, 2, 3, 4, 5, 6].map((item, index) => (
            <motion.input
              key={item}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.05,
              }}
              maxLength={1}
              inputMode="numeric"
              value={code[index]}
              onChange={(event) =>
                updateCode(
                  index,
                  event.target.value
                )
              }
              className={`h-16 w-14 rounded-3xl border bg-white/[0.04] text-center text-2xl font-black outline-none transition-all ${
                index === 2
                  ? "border-purple-500/50 shadow-[0_0_30px_rgba(139,92,246,0.35)]"
                  : "border-white/10"
              }`}
            />
          ))}
        </div>

        {/* TIMER */}
        <div className="mt-8 flex items-center justify-between text-sm">
          <span className="text-white/40">
            Resend code in
          </span>

          <span className="font-semibold text-purple-300">
            00:24
          </span>
        </div>

        {/* VERIFY */}
        <motion.button
          type="button"
          whileHover={{
            scale: canVerify ? 1.02 : 1,
          }}
          whileTap={{
            scale: canVerify ? 0.98 : 1,
          }}
          onClick={handleVerify}
          disabled={!canVerify}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-500 py-5 text-lg font-bold shadow-[0_10px_40px_rgba(139,92,246,0.35)] transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          Verify & Continue

          <ArrowRight className="h-5 w-5" />
        </motion.button>

        {/* RESEND */}
        <button
          type="button"
          onClick={handleResend}
          className="mt-5 w-full text-center text-sm text-white/45 transition-all hover:text-white"
        >
          Didn&apos;t receive anything? Resend
        </button>

        {/* SECURITY */}
        <div className="mt-10 flex items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <ShieldCheck className="h-5 w-5 text-green-400" />

          <span className="text-sm text-white/55">
            End-to-end encrypted verification
          </span>
        </div>
      </motion.div>
    </main>
  );
}

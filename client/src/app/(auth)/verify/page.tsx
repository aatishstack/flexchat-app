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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0C0C10] px-6 text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="absolute left-[-100px] top-[-100px] h-[400px] w-[400px] rounded-full bg-[#7C4FF0]/20 blur-[120px]"
        />
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
        className="relative z-10 w-full max-w-md rounded-[40px] border border-white/[0.06] bg-[#16161D]/80 p-10 backdrop-blur-3xl shadow-[0_48px_100px_-12px_rgba(0,0,0,0.8)]"
      >
        {/* BACK */}
        <Link
          href="/auth"
          className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-white/30 transition-all hover:text-[#7C4FF0]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to access
        </Link>

        {/* ICON */}
        <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#0C0C10] shadow-2xl border border-white/5 overflow-hidden">
           <img src="/logo.jpeg" alt="FlexChat" className="h-full w-full object-cover" />
        </div>

        {/* TITLE */}
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Verify
          </h1>

          <p className="mt-4 text-[15px] font-medium leading-relaxed text-white/40">
            We sent a secure verification code to your
            registered device.
          </p>
        </div>

        {/* PHONE */}
        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C4FF0]/10">
            <ShieldCheck className="h-4 w-4 text-[#7C4FF0]" />
          </div>

          <span className="text-[14px] font-bold text-white/60 tracking-tight">
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
              className={`h-15 w-12 rounded-2xl border bg-white/[0.03] text-center text-xl font-black outline-none transition-all ${
                code[index]
                  ? "border-[#7C4FF0]/50 shadow-[0_0_20px_rgba(124,79,240,0.2)]"
                  : "border-white/10"
              } focus:border-[#7C4FF0]/50`}
            />
          ))}
        </div>

        {/* TIMER */}
        <div className="mt-8 flex items-center justify-between text-[13px] font-medium">
          <span className="text-white/30 uppercase tracking-widest text-[11px] font-bold">
            Resend Code
          </span>

          <span className="font-bold text-[#7C4FF0]">
            00:24
          </span>
        </div>

        {/* VERIFY */}
        <motion.button
          type="button"
          whileHover={{
            scale: canVerify ? 1.01 : 1,
          }}
          whileTap={{
            scale: canVerify ? 0.98 : 1,
          }}
          onClick={handleVerify}
          disabled={!canVerify}
          className="mt-10 flex w-full items-center justify-center gap-3 rounded-[20px] bg-[#7C4FF0] py-4.5 text-[15.5px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#7C4FF0]/20 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Verify Identity
          <ArrowRight className="h-5 w-5" />
        </motion.button>

        {/* SECURITY */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="h-1 w-1 rounded-full bg-[#7C4FF0]" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/20">
            End-to-End Encrypted
          </span>
          <div className="h-1 w-1 rounded-full bg-[#7C4FF0]" />
        </div>
      </motion.div>
    </main>
  );
}

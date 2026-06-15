"use client";

import { motion } from "framer-motion";
import { Hammer } from "lucide-react";
import Link from "next/link";

interface Props {
  title: string;
}

export default function ComingSoon({ title }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fc-surface-strong flex flex-col items-center gap-6 rounded-3xl border p-12 sm:p-16"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2AABEE]/10 text-[#2AABEE]">
          <Hammer size={40} />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="fc-muted mt-2 max-w-xs text-sm">
            We&apos;re working hard to bring this feature to you. Stay tuned!
          </p>
        </div>

        <Link
          href="/chat"
          className="fc-button-primary flex h-12 items-center justify-center rounded-2xl px-8 font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Back to Chat
        </Link>
      </motion.div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-gradient-to-br from-[var(--fc-primary)] to-[#6D28D9] shadow-[0_20px_60px_rgba(var(--fc-primary-rgb),0.3)]">
          <MessageCircle size={64} className="text-white" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute bottom-[calc(2.5rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-2 opacity-40">
           <div className="h-4 w-4 rounded-full border border-white/20 border-t-white animate-spin" />
           <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-white">
             Securely Encrypted
           </span>
        </div>
      </motion.div>
    </div>
  );
}

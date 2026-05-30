"use client";

import { Check } from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

type ToastProps = {
  show: boolean;
  title: string;
  description: string;
};

export default function Toast({
  show,
  title,
  description,
}: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 40,
          }}
          className="absolute bottom-24 right-4 z-[130] flex items-center gap-3 rounded-2xl border border-sky-200/15 bg-[#09111f]/90 px-4 py-3 shadow-[0_20px_64px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl md:bottom-6"
        >
          <div className="rounded-full border border-sky-200/20 bg-sky-400/15 p-2 text-sky-50">
            <Check size={14} />
          </div>

          <div>
            <h3 className="font-semibold">
              {title}
            </h3>

            <p className="text-sm text-zinc-300">
              {description}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
          className="absolute bottom-24 right-4 z-[130] flex items-center gap-4 rounded-[28px] border border-green-500/20 bg-green-500/10 px-5 py-4 backdrop-blur-3xl md:bottom-6"
        >
          <div className="rounded-full bg-green-500 p-2">
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
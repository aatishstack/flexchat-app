"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Phone,
  PhoneOff,
} from "lucide-react";

import { useCallStore } from "../../../store/call-store";

export default function IncomingCallPopup() {
  const {
    status,
    caller,
    acceptCall,
    rejectCall,
  } = useCallStore();

  return (
    <AnimatePresence>
      {status ===
        "incoming" && (
        <motion.div
          initial={{
            opacity: 0,
            y: 40,
            scale: 0.8,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: 40,
            scale: 0.8,
          }}
          transition={{
            type: "spring",
            stiffness: 240,
            damping: 22,
          }}
          className="fixed left-1/2 top-10 z-[250] w-[340px] -translate-x-1/2 overflow-hidden rounded-[34px] border border-green-400/20 bg-black/70 shadow-2xl shadow-green-500/20 backdrop-blur-3xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />

          <div className="relative z-10 p-6">
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  scale: [
                    1,
                    1.08,
                    1,
                  ],
                }}
                transition={{
                  duration: 1.6,
                  repeat:
                    Infinity,
                }}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-3xl font-semibold text-white shadow-2xl shadow-green-500/30"
              >
                {caller
                  .charAt(0)
                  .toUpperCase()}
              </motion.div>

              <p className="mt-5 text-sm text-zinc-400">
                Incoming Call
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-white">
                {caller}
              </h2>

              <div className="mt-8 flex items-center gap-8">
                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  onClick={
                    rejectCall
                  }
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-xl shadow-red-500/30"
                >
                  <PhoneOff
                    size={26}
                  />
                </motion.button>

                <motion.button
                  whileTap={{
                    scale: 0.92,
                  }}
                  onClick={
                    acceptCall
                  }
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-xl shadow-green-500/30"
                >
                  <Phone
                    size={26}
                  />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
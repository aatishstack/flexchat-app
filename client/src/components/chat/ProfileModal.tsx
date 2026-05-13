"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({
  open,
  onClose,
}: Props) {

  return (

    <AnimatePresence>

      {open && (

        <motion.div

          initial={{
            opacity: 0,
          }}

          animate={{
            opacity: 1,
          }}

          exit={{
            opacity: 0,
          }}

          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >

          <motion.div

            initial={{
              scale: 0.95,
              opacity: 0,
              y: 20,
            }}

            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
            }}

            exit={{
              scale: 0.95,
              opacity: 0,
              y: 20,
            }}

            className="w-full max-w-[420px] rounded-[32px] border border-white/10 bg-[#111827] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
          >

            <div className="flex flex-col items-center">

              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400" />

              <h2 className="mt-5 text-2xl font-bold text-white">

                Aatish

              </h2>

              <p className="mt-2 text-sm text-white/45">

                Building FlexChat

              </p>

            </div>

            <div className="mt-8 space-y-4">

              <div className="rounded-2xl bg-white/5 px-5 py-4">

                <p className="text-sm text-white/40">

                  Username

                </p>

                <h3 className="mt-1 text-white">

                  @aatish_04

                </h3>

              </div>

              <div className="rounded-2xl bg-white/5 px-5 py-4">

                <p className="text-sm text-white/40">

                  Bio

                </p>

                <h3 className="mt-1 text-white">

                  Premium realtime messaging experience.

                </h3>

              </div>

            </div>

            <button
              onClick={onClose}
              className="mt-8 w-full rounded-2xl bg-purple-500 py-4 font-medium text-white transition hover:bg-purple-400"
            >

              Close

            </button>

          </motion.div>

        </motion.div>
      )}

    </AnimatePresence>
  );
}
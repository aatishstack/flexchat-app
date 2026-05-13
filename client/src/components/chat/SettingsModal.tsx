"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({
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

            className="w-full max-w-[520px] rounded-[32px] border border-white/10 bg-[#111827] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-purple-400">

                  FlexChat

                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">

                  Settings

                </h2>

              </div>

              <button
                onClick={onClose}
                className="rounded-xl bg-white/5 px-4 py-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >

                Close

              </button>

            </div>

            <div className="mt-8 space-y-4">

              <button className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-5 py-4 text-left transition hover:bg-white/10">

                <div>

                  <h3 className="font-medium text-white">

                    Appearance

                  </h3>

                  <p className="mt-1 text-sm text-white/40">

                    Themes and colors

                  </p>

                </div>

                <span className="text-white/30">

                  →

                </span>

              </button>

              <button className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-5 py-4 text-left transition hover:bg-white/10">

                <div>

                  <h3 className="font-medium text-white">

                    Notifications

                  </h3>

                  <p className="mt-1 text-sm text-white/40">

                    Sounds and alerts

                  </p>

                </div>

                <span className="text-white/30">

                  →

                </span>

              </button>

              <button className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-5 py-4 text-left transition hover:bg-white/10">

                <div>

                  <h3 className="font-medium text-white">

                    Privacy

                  </h3>

                  <p className="mt-1 text-sm text-white/40">

                    Security and visibility

                  </p>

                </div>

                <span className="text-white/30">

                  →

                </span>

              </button>

            </div>

          </motion.div>

        </motion.div>
      )}

    </AnimatePresence>
  );
}
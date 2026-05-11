"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const chats = [
  {
    name: "Mayuri",
    msg: "Realtime sync 😈",
    online: true,
  },
  {
    name: "Flex AI",
    msg: "AI summary generated",
    online: true,
  },
  {
    name: "Creators Hub",
    msg: "New UI uploaded",
    online: false,
  },
];

export default function MobileSidebar({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
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
            onClick={onClose}
            className="fixed inset-0 z-[9997] bg-black/50 backdrop-blur-sm xl:hidden"
          />

          {/* SIDEBAR */}
          <motion.div
            initial={{
              x: -400,
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: -400,
            }}
            transition={{
              type: "spring",
              damping: 24,
            }}
            className="fixed left-0 top-0 z-[9998] flex h-full w-[340px] flex-col border-r border-white/10 bg-[#050816]/95 shadow-[0_20px_120px_rgba(0,0,0,0.6)] backdrop-blur-3xl xl:hidden"
          >
            {/* HEADER */}
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300">
                    FLEXCHAT
                  </p>

                  <h2 className="mt-1 text-4xl font-black">
                    Chats
                  </h2>
                </div>

                <button
                  onClick={onClose}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  ✕
                </button>
              </div>

              <input
                placeholder="Search..."
                className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 outline-none placeholder:text-white/35"
              />
            </div>

            {/* LIST */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {chats.map((chat, index) => (
                <motion.button
                  key={index}
                  whileTap={{
                    scale: 0.97,
                  }}
                  className="flex w-full items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-left"
                >
                  {/* AVATAR */}
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 font-black">
                      {chat.name.charAt(0)}
                    </div>

                    {chat.online && (
                      <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#050816] bg-green-400" />
                    )}
                  </div>

                  {/* INFO */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-black">
                      {chat.name}
                    </h3>

                    <p className="mt-1 truncate text-sm text-white/50">
                      {chat.msg}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
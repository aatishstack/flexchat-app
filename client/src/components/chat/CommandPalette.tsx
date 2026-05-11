"use client";

import { useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const commands = [
  {
    icon: "💬",
    title: "Open Chats",
    desc: "Jump to conversations",
  },
  {
    icon: "🔍",
    title: "Search Messages",
    desc: "Global realtime search",
  },
  {
    icon: "📞",
    title: "Start Voice Call",
    desc: "Launch encrypted call",
  },
  {
    icon: "🎥",
    title: "Start Video Call",
    desc: "Open HD meeting",
  },
  {
    icon: "✨",
    title: "Open Flex AI",
    desc: "AI assistant tools",
  },
];

export default function CommandPalette({
  open,
  onClose,
}: Props) {
  useEffect(() => {
    const handleKey = (
      e: KeyboardEvent
    ) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKey
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKey
      );
    };
  }, [onClose]);

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
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
          />

          {/* PANEL */}
          <motion.div
            initial={{
              opacity: 0,
              y: -40,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -40,
              scale: 0.96,
            }}
            transition={{
              type: "spring",
              damping: 22,
            }}
            className="fixed left-1/2 top-[12%] z-[9999] w-[92%] max-w-2xl -translate-x-1/2 overflow-hidden rounded-[40px] border border-white/10 bg-[#050816]/95 shadow-[0_20px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl"
          >
            {/* HEADER */}
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
                <span className="text-2xl">
                  🔍
                </span>

                <input
                  autoFocus
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-lg outline-none placeholder:text-white/35"
                />

                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/40">
                  ESC
                </div>
              </div>
            </div>

            {/* COMMANDS */}
            <div className="max-h-[500px] overflow-y-auto p-4">
              {commands.map(
                (command, index) => (
                  <motion.button
                    key={index}
                    whileHover={{
                      scale: 1.01,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    className="mb-3 flex w-full items-center gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-left"
                  >
                    {/* ICON */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-r from-purple-600 to-cyan-500 text-2xl">
                      {command.icon}
                    </div>

                    {/* INFO */}
                    <div className="flex-1">
                      <h3 className="font-black">
                        {command.title}
                      </h3>

                      <p className="mt-1 text-sm text-white/50">
                        {command.desc}
                      </p>
                    </div>

                    {/* SHORTCUT */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/40">
                      ↵
                    </div>
                  </motion.button>
                )
              )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center justify-between text-sm text-white/40">
                <p>
                  Navigate with arrow keys
                </p>

                <p>Flex Command Engine</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Sparkles,
  X,
} from "lucide-react";

type Props = {
  open: boolean;

  onClose: () => void;
};

export default function MobileAISheet({
  open,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
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
            className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-md xl:hidden"
          />

          {/* SHEET */}
          <motion.div
            drag="y"
            dragConstraints={{
              top: 0,
              bottom: 0,
            }}
            onDragEnd={(
              _,
              info
            ) => {
              if (
                info.offset.y >
                140
              ) {
                onClose();
              }
            }}
            initial={{
              y: "100%",
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: "100%",
            }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 26,
            }}
            className="fixed bottom-0 left-0 right-0 z-[190] h-[88vh] overflow-hidden rounded-t-[36px] border-t border-white/10 bg-[#0B111C]/95 shadow-2xl backdrop-blur-3xl xl:hidden"
          >
            {/* HANDLE */}
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-16 rounded-full bg-white/20" />
            </div>

            {/* HEADER */}
            <div className="flex items-center justify-between px-6 pb-5 pt-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-500 text-white shadow-2xl shadow-purple-500/30">
                  <Sparkles />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Flex AI
                  </h2>

                  <p className="text-sm text-zinc-400">
                    Smart assistant
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="space-y-5 overflow-y-auto px-5 pb-40">
              <div className="rounded-[32px] border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 p-5">
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Smart Suggestions
                </h3>

                <p className="text-sm leading-relaxed text-zinc-300">
                  Ask Flex AI to summarize chats,
                  generate smart replies, search
                  files, and manage conversations.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  "Summarize unread chats",
                  "Generate smart reply",
                  "Search media & files",
                  "Manage conversations",
                  "Create AI notes",
                ].map(
                  (
                    item
                  ) => (
                    <button
                      key={item}
                      className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left text-white transition hover:bg-white/[0.07]"
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* INPUT */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-[#0B111C]/95 p-4 backdrop-blur-2xl">
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4">
                <input
                  placeholder="Ask Flex AI..."
                  className="h-14 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
                />

                <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-xl shadow-purple-500/30">
                  <Sparkles
                    size={18}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

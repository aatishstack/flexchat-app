"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  X,
} from "lucide-react";

type Props = {
  open: boolean;

  onClose: () => void;
};

const notifications = [
  {
    icon: MessageCircle,
    title: "New message",
    text: "Mayuri sent a new message",
  },
  {
    icon: Heart,
    title: "Reaction received",
    text: "Someone reacted to your story",
  },
  {
    icon: UserPlus,
    title: "New follower",
    text: "A new user followed you",
  },
];

export default function MobileNotificationSheet({
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
                120
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
            className="fixed bottom-0 left-0 right-0 z-[190] h-[82vh] overflow-hidden rounded-t-[36px] border-t border-white/10 bg-[#0B111C]/95 shadow-2xl backdrop-blur-3xl xl:hidden"
          >
            {/* HANDLE */}
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-16 rounded-full bg-white/20" />
            </div>

            {/* HEADER */}
            <div className="flex items-center justify-between px-6 pb-5 pt-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-2xl shadow-orange-500/30">
                  <Bell />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Notifications
                  </h2>

                  <p className="text-sm text-zinc-400">
                    Recent activity
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

            {/* LIST */}
            <div className="space-y-4 overflow-y-auto px-5 pb-20">
              {notifications.map(
                (
                  item,
                  index
                ) => {
                  const Icon =
                    item.icon;

                  return (
                    <motion.div
                      key={index}
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index *
                          0.08,
                      }}
                      className="flex items-start gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-400">
                        <Icon
                          size={22}
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-medium text-white">
                          {
                            item.title
                          }
                        </h3>

                        <p className="mt-1 text-sm text-zinc-400">
                          {
                            item.text
                          }
                        </p>
                      </div>
                    </motion.div>
                  );
                }
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

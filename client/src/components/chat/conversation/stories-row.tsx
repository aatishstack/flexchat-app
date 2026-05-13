"use client";

import { motion } from "framer-motion";

const stories = [
  {
    id: 1,
    name: "Mayuri",
    avatar: "M",
    active: true,
  },

  {
    id: 2,
    name: "Aatish",
    avatar: "A",
    active: true,
  },

  {
    id: 3,
    name: "Flex AI",
    avatar: "F",
    active: false,
  },

  {
    id: 4,
    name: "Dev Room",
    avatar: "D",
    active: true,
  },
];

export default function StoriesRow() {
  return (
    <div className="flex gap-4 overflow-x-auto border-b border-white/10 px-6 py-4">
      {stories.map(
        (
          story
        ) => (
          <motion.button
            key={story.id}
            whileHover={{
              scale: 1.05,
            }}
            className="flex flex-col items-center gap-2"
          >
            <div
              className={`relative flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white ${
                story.active
                  ? "bg-gradient-to-br from-purple-600 to-fuchsia-600"
                  : "bg-zinc-700"
              }`}
            >
              {story.avatar}

              {story.active && (
                <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-pulse" />
              )}
            </div>

            <span className="max-w-[70px] truncate text-xs text-zinc-300">
              {story.name}
            </span>
          </motion.button>
        )
      )}
    </div>
  );
}
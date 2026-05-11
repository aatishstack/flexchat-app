"use client";

import { motion } from "framer-motion";

const stories = [
  {
    name: "Mayuri",
    active: true,
  },
  {
    name: "Flex AI",
    active: true,
  },
  {
    name: "Creators",
    active: false,
  },
  {
    name: "Realtime",
    active: true,
  },
  {
    name: "Design",
    active: false,
  },
];

export default function StoriesBar() {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-5">
        {stories.map((story, index) => (
          <motion.button
            key={index}
            whileHover={{
              scale: 1.05,
            }}
            whileTap={{
              scale: 0.95,
            }}
            className="flex flex-col items-center gap-3"
          >
            {/* RING */}
            <div
              className={`rounded-full bg-gradient-to-r p-[3px] ${
                story.active
                  ? "from-purple-500 via-cyan-400 to-purple-500"
                  : "from-white/10 to-white/10"
              }`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#050816]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-lg font-black">
                  {story.name.charAt(0)}
                </div>
              </div>
            </div>

            {/* NAME */}
            <p className="max-w-[70px] truncate text-xs text-white/70">
              {story.name}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
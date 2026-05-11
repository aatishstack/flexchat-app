"use client";

import { motion } from "framer-motion";

const users = [
  "A",
  "M",
  "S",
  "K",
  "R",
];

export default function OnlineUsers() {
  return (
    <div className="flex items-center">
      {users.map((user, index) => (
        <motion.div
          key={index}
          initial={{
            scale: 0,
          }}
          animate={{
            scale: 1,
          }}
          transition={{
            delay: index * 0.05,
          }}
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#050816] bg-gradient-to-r from-purple-600 to-cyan-500 font-black first:ml-0"
        >
          {user}
        </motion.div>
      ))}

      <div className="ml-3">
        <p className="text-sm text-cyan-300">
          LIVE NOW
        </p>

        <h3 className="font-black">
          1,284 online
        </h3>
      </div>
    </div>
  );
}
"use client";

import { motion } from "framer-motion";

import { FaTelegramPlane } from "react-icons/fa";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#020206]">

      <div className="flex flex-col items-center gap-6">

        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            rotate: [0, 8, -8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="h-24 w-24 rounded-[36px] bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center premium-shadow"
        >
          <FaTelegramPlane
            size={38}
            className="text-white"
          />
        </motion.div>

        <div className="text-center">

          <h1 className="text-3xl font-black tracking-tight">
            FlexChat
          </h1>

          <p className="text-zinc-400 mt-2 text-sm">
            Premium Messaging Experience
          </p>
        </div>
      </div>
    </div>
  );
}
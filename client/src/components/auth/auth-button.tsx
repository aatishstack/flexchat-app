"use client";

import { motion } from "framer-motion";

interface Props {
  text: string;
  loading?: boolean;
}

export default function AuthButton({
  text,
  loading,
}: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      disabled={loading}
      type="submit"
      className="
        relative
        overflow-hidden
        rounded-2xl
        bg-[#2481CC]
        py-3
        font-semibold
        text-white
        transition-all
        duration-300
        hover:bg-[#2F8ED8]
        disabled:cursor-not-allowed
        disabled:opacity-70
      "
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />

      <span className="relative z-10">
        {loading ? "Please wait..." : text}
      </span>
    </motion.button>
  );
}

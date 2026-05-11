"use client";

import {
  MessageCircle,
  Users,
  Bell,
  Sparkles,
  Settings,
} from "lucide-react";

import { motion } from "framer-motion";

const items = [
  MessageCircle,
  Users,
  Bell,
  Sparkles,
  Settings,
];

export default function FloatingDock() {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-3 rounded-3xl border border-white/10 bg-black/30 p-3 backdrop-blur-2xl lg:hidden"
    >
      {items.map((Icon, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.12, y: -4 }}
          whileTap={{ scale: 0.92 }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5"
        >
          <Icon className="h-6 w-6 text-white" />
        </motion.button>
      ))}
    </motion.div>
  );
}
import { Outlet } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router";

export function RootLayout() {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full w-full bg-[#0C0C10] overflow-hidden relative">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full flex flex-col absolute inset-0"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

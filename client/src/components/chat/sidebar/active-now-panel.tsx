"use client";

import { motion } from "framer-motion";

import { useActiveStore } from "@/store/active-store";

export default function ActiveNowPanel() {
  const users =
    useActiveStore(
      (state) =>
        state.users
    );

  return (
    <aside className="hidden h-full w-[320px] border-l border-white/10 bg-[#0B111C] xl:flex xl:flex-col">
      <div className="border-b border-white/10 p-5">
        <h2 className="text-xl font-semibold text-white">
          Active Now
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Live presence
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {users.map(
          (
            user
          ) => (
            <motion.div
              key={user.id}
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-lg font-bold text-white">
                  {user.avatar}
                </div>

                <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#0B111C] bg-green-500 shadow-lg shadow-green-500/40" />
              </div>

              <div>
                <h3 className="font-medium text-white">
                  {user.name}
                </h3>

                <p className="text-sm text-zinc-500">
                  {user.status}
                </p>
              </div>
            </motion.div>
          )
        )}
      </div>
    </aside>
  );
}

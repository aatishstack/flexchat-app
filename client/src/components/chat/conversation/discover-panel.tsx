"use client";

import { motion } from "framer-motion";

const users = [
  {
    id: 1,
    name: "Mayuri",
    tag: "@mayuri",
  },

  {
    id: 2,
    name: "Flex AI",
    tag: "@flexai",
  },

  {
    id: 3,
    name: "Dev Room",
    tag: "@devroom",
  },

  {
    id: 4,
    name: "Aatish",
    tag: "@aatish",
  },
];

export default function DiscoverPanel() {
  return (
    <aside className="hidden w-[320px] border-r border-white/10 bg-[#0B111C] xl:flex xl:flex-col">
      <div className="border-b border-white/10 p-5">
        <h2 className="text-xl font-semibold text-white">
          Discover
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Trending people & rooms
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {users.map(
          (
            user
          ) => (
            <motion.div
              key={user.id}
              whileHover={{
                scale: 1.02,
              }}
              className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-lg font-bold text-white">
                  {user.name.charAt(
                    0
                  )}
                </div>

                <div>
                  <h3 className="font-medium text-white">
                    {user.name}
                  </h3>

                  <p className="text-sm text-zinc-500">
                    {user.tag}
                  </p>
                </div>
              </div>

              <button className="rounded-2xl border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition-all hover:bg-purple-500/20">
                Follow
              </button>
            </motion.div>
          )
        )}
      </div>
    </aside>
  );
}
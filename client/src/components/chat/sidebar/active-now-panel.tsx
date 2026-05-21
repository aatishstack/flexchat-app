"use client";

import { useMemo } from "react";

import {
  motion,
  useReducedMotion,
} from "framer-motion";

import { useUsersByIdsQuery } from "@/hooks/queries/use-users-query";
import {
  formatDisplayName,
  getAvatarInitial,
} from "@/lib/user-display";
import { useSocketStore } from "@/store/socket-store";
import { useAuthStore } from "@/stores/auth.store";

type ActiveNowPanelProps = {
  variant?: "rail" | "sheet";
};

export default function ActiveNowPanel({
  variant = "rail",
}: ActiveNowPanelProps) {
  const reducedMotion =
    useReducedMotion();
  const currentUserId =
    useAuthStore(
      (state) => state.user?.id
    );
  const onlineUsers =
    useSocketStore(
      (state) =>
        state.onlineUsers
    );
  const onlinePeerIds =
    useMemo(
      () =>
        onlineUsers.filter(
          (userId) =>
            userId !== currentUserId
        ),
      [
        currentUserId,
        onlineUsers,
      ]
    );
  const onlineUsersQuery =
    useUsersByIdsQuery(
      onlinePeerIds
    );
  const users =
    onlineUsersQuery.data ?? [];

  return (
    <aside
      className={
        variant === "rail"
          ? "hidden h-full w-[320px] border-l border-white/10 bg-[#08111f]/[0.82] shadow-2xl shadow-black/20 backdrop-blur-3xl xl:flex xl:flex-col"
          : "flex h-full w-full flex-col bg-[#08111f]/[0.94] backdrop-blur-3xl"
      }
    >
      <div className="border-b border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold text-white">
          Active Now
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Live presence
        </p>
      </div>

      <div className="chat-safe-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {onlineUsersQuery.isLoading &&
        onlinePeerIds.length ? (
          <div className="space-y-3">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="h-[82px] animate-pulse rounded-3xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : null}

        {onlineUsersQuery.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Unable to load presence
          </div>
        ) : null}

        {!onlinePeerIds.length ||
        (!onlineUsersQuery.isLoading &&
          !users.length) ? (
          <div className="flex h-full items-center justify-center px-5 text-center text-sm text-zinc-500">
            No other users online
          </div>
        ) : null}

        {users.map((user) => (
          <motion.div
            key={user.id}
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    x: 18,
                  }
            }
            animate={{
              opacity: 1,
              x: 0,
            }}
            className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-lg shadow-black/10"
          >
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-lg font-bold text-white">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getAvatarInitial(
                    user.username
                  )
                )}
              </div>

              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#0B111C] bg-green-500 shadow-lg shadow-green-500/40" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-medium text-white">
                {formatDisplayName(
                  user.username
                )}
              </h3>

              <p className="text-sm text-zinc-500">
                Online
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </aside>
  );
}

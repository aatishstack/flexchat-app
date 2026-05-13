"use client";

import {
  Search,
  X,
} from "lucide-react";

import { useMemo } from "react";

import { useConversationStore } from "@/stores/conversation.store";

import { useGlobalSearchStore } from "@/store/global-search-store";

export default function GlobalSearch() {
  const conversations =
    useConversationStore(
      (state) =>
        state.conversations
    );

  const open =
    useGlobalSearchStore(
      (state) =>
        state.open
    );

  const query =
    useGlobalSearchStore(
      (state) =>
        state.query
    );

  const setOpen =
    useGlobalSearchStore(
      (state) =>
        state.setOpen
    );

  const setQuery =
    useGlobalSearchStore(
      (state) =>
        state.setQuery
    );

  const filtered =
    useMemo(() => {
      return conversations.filter(
        (conversation) =>
          conversation.name
            ?.toLowerCase()
            .includes(
              query.toLowerCase()
            )
      );
    }, [
      conversations,
      query,
    ]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[120] flex items-start justify-center bg-black/70 pt-24 backdrop-blur-xl">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#111827] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search
            size={20}
            className="text-zinc-500"
          />

          <input
            autoFocus
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            placeholder="Search globally..."
            className="h-12 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
          />

          <button
            onClick={() =>
              setOpen(
                false
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[600px] space-y-2 overflow-y-auto p-4">
          {filtered.map(
            (
              conversation
            ) => (
              <button
                key={
                  conversation.id
                }
                className="flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.05]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-lg font-bold text-white">
                  {conversation.name?.charAt(
                    0
                  ) || "F"}
                </div>

                <div>
                  <h3 className="font-medium text-white">
                    {
                      conversation.name
                    }
                  </h3>

                  <p className="text-sm text-zinc-500">
                    {
                      conversation.latestMessage
                    }
                  </p>
                </div>
              </button>
            )
          )}

          {!filtered.length && (
            <div className="py-16 text-center text-zinc-500">
              No conversations found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { create } from "zustand";

interface ReactionMap {
  [messageId: string]:
    string[];
}

interface ReactionState {
  reactions:
    ReactionMap;

  react: (
    messageId: string,
    emoji: string
  ) => void;
}

export const useReactionStore =
  create<ReactionState>(
    (set) => ({
      reactions: {},

      react: (
        messageId,
        emoji
      ) =>
        set(
          (
            state
          ) => {
            const current =
              state.reactions[
                messageId
              ] || [];

            return {
              reactions: {
                ...state.reactions,

                [messageId]:
                  [
                    ...current,
                    emoji,
                  ],
              },
            };
          }
        ),
    })
  );
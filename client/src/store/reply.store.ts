"use client";

import { create } from "zustand";

interface ReplyStore {
  replyingTo: string | null;

  setReplyingTo: (
    text: string | null
  ) => void;
}

export const useReplyStore =
  create<ReplyStore>((set) => ({
    replyingTo: null,

    setReplyingTo: (text) =>
      set({
        replyingTo: text,
      }),
  }));
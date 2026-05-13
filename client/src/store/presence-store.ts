"use client";

import { create } from "zustand";

interface PresenceState {
  onlineUsers:
    string[];

  typingUsers:
    string[];

  setOnline: (
    users: string[]
  ) => void;

  setTyping: (
    users: string[]
  ) => void;
}

export const usePresenceStore =
  create<PresenceState>(
    (set) => ({
      onlineUsers: [],

      typingUsers: [],

      setOnline: (
        users
      ) =>
        set({
          onlineUsers:
            users,
        }),

      setTyping: (
        users
      ) =>
        set({
          typingUsers:
            users,
        }),
    })
  );
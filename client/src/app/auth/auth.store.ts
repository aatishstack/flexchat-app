"use client";

import { create } from "zustand";

interface User {
  id: string;

  name: string;

  email: string;
}

interface AuthStore {
  user: User | null;

  token: string | null;

  setAuth: (
    token: string,
    user: User
  ) => void;

  logout: () => void;
}

export const useAuthStore =
  create<AuthStore>((set) => ({
    user: null,

    token: null,

    setAuth: (
      token,
      user
    ) => {
      localStorage.setItem(
        "token",
        token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      set({
        token,
        user,
      });
    },

    logout: () => {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      set({
        token: null,
        user: null,
      });
    },
  }));
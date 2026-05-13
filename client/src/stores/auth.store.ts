"use client";

import { create } from "zustand";

interface User {
  id: string;

  username: string;

  email: string;
}

interface AuthState {
  user: User | null;

  token: string | null;

  isAuthenticated: boolean;

  isHydrated: boolean;

  setHydrated: (
    value: boolean
  ) => void;

  setAuth: (
    data: {
      user: User;

      token: string;
    }
  ) => void;

  logout: () => void;
}

export const useAuthStore =
  create<AuthState>(
    (set) => ({
      user: null,

      token: null,

      isAuthenticated:
        false,

      isHydrated: false,

      setHydrated:
        (
          value
        ) =>
          set({
            isHydrated:
              value,
          }),

      setAuth: (
        data
      ) =>
        set({
          user: data.user,

          token:
            data.token,

          isAuthenticated:
            true,
        }),

      logout: () =>
        set({
          user: null,

          token: null,

          isAuthenticated:
            false,
        }),
    })
  );
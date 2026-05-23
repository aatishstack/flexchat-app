"use client";

import { create } from "zustand";

interface User {
  id: string;

  username: string;

  email: string;

  avatar?: string | null;

  createdAt?: string | null;
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

  updateUser: (
    user: Partial<User>
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

          isHydrated:
          true,
        }),

      updateUser: (
        user
      ) =>
        set(
          (
            state
          ) => ({
            user:
              state.user
                ? {
                    ...state.user,
                    ...user,
                  }
                : null,
          })
        ),

      logout: () =>
        set({
          user: null,

          token: null,

          isAuthenticated:
            false,

          isHydrated:
            true,
        }),
    })
  );

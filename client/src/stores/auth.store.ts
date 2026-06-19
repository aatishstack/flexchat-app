"use client";

import { create } from "zustand";

interface User {
  id: string;

  username: string;

  email: string;

  avatar?: string | null;

  phoneNumber?: string | null;

  createdAt?: string | null;
}

interface AuthState {
  user: User | null;

  token: string | null;

  refreshToken: string | null;

  isAuthenticated: boolean;

  isHydrated: boolean;

  isSessionRecovering: boolean;

  setHydrated: (
    value: boolean
  ) => void;

  setSessionRecovering: (
    value: boolean
  ) => void;

  setAuth: (
    data: {
      user: User;

      token: string;

      refreshToken?: string | null;
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

      refreshToken: null,

      isAuthenticated:
        false,

      isHydrated: false,

      isSessionRecovering:
        false,

      setHydrated:
        (
          value
        ) =>
          set({
            isHydrated:
              value,
          }),

      setSessionRecovering:
        (
          value
        ) =>
          set({
            isSessionRecovering:
              value,
          }),

      setAuth: (
        data
      ) => {
        console.info("[AUTH] auth store updated", {
          userId: data.user.id,
          hasToken: Boolean(data.token),
          hasRefreshToken: Boolean(data.refreshToken),
        });

        set({
          user: data.user,

          token:
            data.token,

          refreshToken:
            data.refreshToken ?? null,

          isAuthenticated:
            true,

          isHydrated:
          true,

          isSessionRecovering:
            false,
        });
      },

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

      logout: () => {
        console.info("[AUTH] auth store cleared");

        set({
          user: null,

          token: null,

          refreshToken: null,

          isAuthenticated:
            false,

          isHydrated:
            true,

          isSessionRecovering:
            false,
        });
      },
    })
  );

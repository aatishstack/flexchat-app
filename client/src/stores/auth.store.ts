"use client";

import { create } from "zustand";

export interface User {
  id: string;

  username: string;

  email: string;

  avatar?: string | null;

  phoneNumber?: string | null;

  createdAt?: string | null;
}

const PERSISTED_USER_KEY = "flexchat_user";

// Persist the authenticated user alongside the token so the app can rehydrate
// the session optimistically on boot (refresh / deploy / backend restart)
// without waiting for /me. The server still validates the token on every
// request, so this is a UX rehydration aid, not a trust boundary.
function persistUser(user: User) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PERSISTED_USER_KEY, JSON.stringify(user));
  } catch {
    // Storage may be unavailable (private mode); ignore.
  }
}

function clearPersistedUser() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(PERSISTED_USER_KEY);
  } catch {
    // ignore
  }
}

export function readPersistedUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(PERSISTED_USER_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<User>;

    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.username === "string" &&
      typeof parsed.email === "string"
    ) {
      return parsed as User;
    }

    return null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;

  token: string | null;

  refreshToken: string | null;

  isAuthenticated: boolean;

  isHydrated: boolean;

  isSessionRecovering: boolean;

  isApiUnavailable: boolean;

  setHydrated: (
    value: boolean
  ) => void;

  setSessionRecovering: (
    value: boolean
  ) => void;

  setApiUnavailable: (
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

      isApiUnavailable:
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

      setApiUnavailable:
        (
          value
        ) =>
          set({
            isApiUnavailable:
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

        persistUser(data.user);

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

          isApiUnavailable:
            false,
        });
      },

      updateUser: (
        user
      ) =>
        set(
          (
            state
          ) => {
            const nextUser = state.user
              ? {
                  ...state.user,
                  ...user,
                }
              : null;

            if (nextUser) {
              persistUser(nextUser);
            }

            return {
              user: nextUser,
            };
          }
        ),

      logout: () => {
        console.info("[AUTH] auth store cleared");

        clearPersistedUser();

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

          isApiUnavailable:
            false,
        });
      },
    })
  );

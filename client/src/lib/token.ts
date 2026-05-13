const TOKEN_KEY =
  "flexchat_token";

export const tokenStorage =
  {
    get() {
      if (
        typeof window ===
        "undefined"
      ) {
        return null;
      }

      return localStorage.getItem(
        TOKEN_KEY
      );
    },

    set(
      token: string
    ) {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      localStorage.setItem(
        TOKEN_KEY,
        token
      );
    },

    remove() {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      localStorage.removeItem(
        TOKEN_KEY
      );
    },

    exists() {
      if (
        typeof window ===
        "undefined"
      ) {
        return false;
      }

      return !!localStorage.getItem(
        TOKEN_KEY
      );
    },
  };
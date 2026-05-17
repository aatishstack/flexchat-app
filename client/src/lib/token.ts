export const TOKEN_KEY =
  "flexchat_token";

export const TOKEN_CHANGE_EVENT =
  "flexchat:token-change";

function emitTokenChange(
  token: string | null
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      TOKEN_CHANGE_EVENT,
      {
        detail: {
          token,
        },
      }
    )
  );
}

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

      emitTokenChange(
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

      emitTokenChange(
        null
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

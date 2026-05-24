recoverSocketConnection: (
    reason = "recovery",
    options,
  ) => {
    const token = get().token;

    if (!token) {
      return;
    }

    const now = Date.now();

    if (
      !options?.force &&
      now - lastSocketRecoveryAt < SOCKET_RECOVERY_COOLDOWN_MS
    ) {
      return;
    }

    const currentSocket = get().socket;

    console.warn("[FlexChat Socket] recovering existing manager", {
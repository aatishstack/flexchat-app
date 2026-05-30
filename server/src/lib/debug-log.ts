export function debugLog(message: string, detail?: unknown) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.FLEXCHAT_DEBUG_LOGS !== "1"
  ) {
    return;
  }

  if (detail === undefined) {
    console.info(message);
    return;
  }

  console.info(message, detail);
}

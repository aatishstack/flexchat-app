export function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return generateId();
  }

  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

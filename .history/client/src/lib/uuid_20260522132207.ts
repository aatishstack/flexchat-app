import { v4 as uuidv4 } from "uuid";

export function generateId() {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return generateId();
    }
  } catch {}

  return uuidv4();
}

export function formatDisplayName(value?: string | null) {
  const normalized =
    value
      ?.trim()
      .replace(/^@+/, "")
      .replace(/[_.-]+/g, " ")
      .replace(/\s+/g, " ");

  if (!normalized) {
    return "FlexChat User";
  }

  if (/^deleted user$/i.test(normalized)) {
    return "Deleted User";
  }

  return normalized
    .split(" ")
    .map((part) =>
      part
        ? `${part.charAt(0).toUpperCase()}${part
            .slice(1)
            .toLowerCase()}`
        : part
    )
    .join(" ");
}

export function formatHandle(value?: string | null) {
  const normalized =
    value?.trim().replace(/^@+/, "") ?? "";

  return normalized
    ? `@${normalized.toLowerCase()}`
    : "@flexchat";
}

export function getAvatarInitial(value?: string | null) {
  return formatDisplayName(value)
    .charAt(0)
    .toUpperCase();
}

import type { CSSProperties } from "react";

export type ChatThemeMode = "dark" | "light";

type ThemeSeed = {
  id: string;
  name: string;
  mode: ChatThemeMode;
  base: string;
  baseAlt?: string;
  panel?: string;
  surface?: string;
  surfaceStrong?: string;
  primary: string;
  primaryHover?: string;
  accent: string;
  warm?: string;
  ownBubble?: string;
  theirBubble?: string;
};

export type ChatTheme = {
  id: string;
  name: string;
  mode: ChatThemeMode;
  background: string;
  header: string;
  composer: string;
  ownBubble: string;
  ownBubbleText: string;
  theirBubble: string;
  theirBubbleText: string;
  accent: string;
  primary: string;
  primaryHover: string;
  text: string;
  mutedText: string;
  subtleText: string;
  appBackground: string;
  panel: string;
  panelStrong: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  elevated: string;
  border: string;
  borderStrong: string;
  input: string;
  inputFocus: string;
  overlay: string;
  overlayStrong: string;
  modal: string;
  skeleton: string;
  selection: string;
  focusRing: string;
  storyGradient: string;
  brandGradient: string;
  accentSoft: string;
  accentMuted: string;
  accentText: string;
  avatar: string;
  shadow: string;
  scrollbar: string;
};

export const DEFAULT_CHAT_THEME_ID = "buttermilk-blue";
export const APP_THEME_STORAGE_KEY = "flexchat:app-theme";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : normalized;
  const numericValue = Number.parseInt(expanded.slice(0, 6), 16);

  return {
    r: (numericValue >> 16) & 255,
    g: (numericValue >> 8) & 255,
    b: numericValue & 255,
  };
}

function rgbTriplet(hex: string) {
  const { r, g, b } = hexToRgb(hex);

  return `${r} ${g} ${b}`;
}

function alpha(hex: string, opacity: number) {
  const { r, g, b } = hexToRgb(hex);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function mix(left: string, right: string, weight = 0.5) {
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);
  const ratio = Math.max(0, Math.min(1, weight));

  const toHex = (value: number) =>
    Math.round(value).toString(16).padStart(2, "0");

  return `#${toHex(leftRgb.r * (1 - ratio) + rightRgb.r * ratio)}${toHex(
    leftRgb.g * (1 - ratio) + rightRgb.g * ratio,
  )}${toHex(leftRgb.b * (1 - ratio) + rightRgb.b * ratio)}`;
}

function createTheme(seed: ThemeSeed): ChatTheme {
  const isLight = seed.mode === "light";
  const warm = seed.warm ?? seed.accent;
  const baseAlt = seed.baseAlt ?? (isLight ? "#ffffff" : mix(seed.base, "#000000", 0.18));
  const text = isLight ? "#172033" : "#f8fbff";
  const mutedText = isLight ? "rgba(38, 50, 72, 0.68)" : "rgba(225, 232, 242, 0.72)";
  const subtleText = isLight ? "rgba(38, 50, 72, 0.48)" : "rgba(225, 232, 242, 0.48)";
  const panel =
    seed.panel ??
    (isLight ? alpha(baseAlt, 0.84) : alpha(mix(seed.base, seed.primary, 0.14), 0.9));
  const panelStrong =
    seed.surfaceStrong ??
    (isLight ? alpha("#ffffff", 0.94) : alpha(mix(seed.base, seed.primary, 0.08), 0.96));
  const surface =
    seed.surface ??
    (isLight ? alpha("#ffffff", 0.72) : alpha(mix(seed.base, "#ffffff", 0.08), 0.68));
  const surfaceHover = isLight ? alpha(seed.primary, 0.08) : alpha("#ffffff", 0.07);
  const surfaceActive = isLight ? alpha(seed.primary, 0.14) : alpha(seed.primary, 0.18);
  const border = isLight ? "rgba(29, 51, 87, 0.12)" : "rgba(255, 255, 255, 0.10)";
  const borderStrong = isLight ? "rgba(29, 51, 87, 0.18)" : "rgba(255, 255, 255, 0.16)";
  const ownBubble =
    seed.ownBubble ??
    `linear-gradient(135deg, ${seed.primary}, ${mix(seed.primary, warm, 0.18)})`;
  const theirBubble =
    seed.theirBubble ??
    (isLight ? alpha("#ffffff", 0.78) : alpha(mix(seed.base, "#ffffff", 0.12), 0.72));
  const primaryHover = seed.primaryHover ?? mix(seed.primary, isLight ? "#10244a" : "#ffffff", 0.15);

  return {
    id: seed.id,
    name: seed.name,
    mode: seed.mode,
    background: seed.base,
    header: panel,
    composer: isLight ? alpha("#ffffff", 0.78) : alpha("#ffffff", 0.07),
    ownBubble,
    ownBubbleText: "#ffffff",
    theirBubble,
    theirBubbleText: text,
    accent: seed.accent,
    primary: seed.primary,
    primaryHover,
    text,
    mutedText,
    subtleText,
    appBackground: isLight
      ? `radial-gradient(circle at 16% -8%, ${alpha(warm, 0.72)}, transparent 30%), radial-gradient(circle at 88% 4%, ${alpha(seed.primary, 0.20)}, transparent 34%), linear-gradient(145deg, ${seed.base} 0%, ${baseAlt} 54%, ${mix(seed.base, warm, 0.26)} 100%)`
      : `radial-gradient(circle at 14% -10%, ${alpha(warm, 0.18)}, transparent 28%), radial-gradient(circle at 88% 2%, ${alpha(seed.primary, 0.24)}, transparent 36%), linear-gradient(145deg, ${seed.base} 0%, ${baseAlt} 52%, ${mix(seed.base, seed.primary, 0.14)} 100%)`,
    panel,
    panelStrong,
    surface,
    surfaceHover,
    surfaceActive,
    elevated: isLight ? alpha("#ffffff", 0.9) : alpha(mix(seed.base, "#ffffff", 0.1), 0.94),
    border,
    borderStrong,
    input: isLight ? alpha("#ffffff", 0.72) : alpha("#ffffff", 0.07),
    inputFocus: isLight ? alpha(seed.primary, 0.08) : alpha(seed.primary, 0.14),
    overlay: isLight ? "rgba(20, 31, 51, 0.34)" : "rgba(0, 0, 0, 0.62)",
    overlayStrong: isLight ? "rgba(20, 31, 51, 0.52)" : "rgba(0, 0, 0, 0.78)",
    modal: isLight ? alpha("#ffffff", 0.94) : alpha(mix(seed.base, "#ffffff", 0.08), 0.97),
    skeleton: isLight ? "rgba(29, 51, 87, 0.07)" : "rgba(255, 255, 255, 0.055)",
    selection: alpha(seed.primary, isLight ? 0.22 : 0.38),
    focusRing: alpha(seed.primary, 0.34),
    storyGradient: `linear-gradient(135deg, ${warm} 0%, ${seed.primary} 58%, ${mix(seed.primary, seed.accent, 0.28)} 100%)`,
    brandGradient: `linear-gradient(135deg, ${warm} 0%, ${seed.primary} 48%, ${seed.accent} 100%)`,
    accentSoft: alpha(seed.primary, isLight ? 0.12 : 0.16),
    accentMuted: alpha(seed.primary, isLight ? 0.18 : 0.24),
    accentText: isLight ? mix(seed.primary, "#07111b", 0.22) : mix(seed.primary, "#ffffff", 0.5),
    avatar: isLight ? alpha(seed.primary, 0.10) : alpha(seed.primary, 0.18),
    shadow: isLight ? "rgba(37, 59, 96, 0.18)" : "rgba(0, 0, 0, 0.46)",
    scrollbar: isLight ? "rgba(29, 51, 87, 0.22)" : "rgba(255, 255, 255, 0.18)",
  };
}

export const CHAT_THEMES: ChatTheme[] = [
  createTheme({
    id: "buttermilk-blue",
    name: "Flex Blue",
    mode: "dark",
    base: "#07111b",
    baseAlt: "#0b1724",
    primary: "#285ccc",
    primaryHover: "#346ee6",
    accent: "#7cc5ff",
    warm: "#8ecfff",
    ownBubble: "linear-gradient(135deg, #2481cc 0%, #2f8ee2 52%, #55b7ff 100%)",
    theirBubble: "linear-gradient(145deg, rgba(23,33,43,0.96), rgba(18,30,43,0.94))",
  }),
  createTheme({
    id: "buttermilk-day",
    name: "Flex Day",
    mode: "light",
    base: "#eef7ff",
    baseAlt: "#f7fbff",
    primary: "#285ccc",
    primaryHover: "#1f4ead",
    accent: "#2481cc",
    warm: "#bfdbfe",
    ownBubble: "linear-gradient(135deg, #285ccc, #477ee8)",
    theirBubble: "rgba(255, 255, 255, 0.82)",
  }),
  createTheme({
    id: "flex-azure",
    name: "Flex Azure",
    mode: "dark",
    base: "#050b16",
    primary: "#2481cc",
    accent: "#38bdf8",
    warm: "#93c5fd",
    ownBubble: "linear-gradient(135deg,#1d5fa8,#2481cc,#38bdf8)",
  }),
  createTheme({
    id: "aurora",
    name: "Aurora",
    mode: "dark",
    base: "#04111d",
    primary: "#06b6d4",
    accent: "#14b8a6",
    warm: "#a7f3d0",
    ownBubble: "linear-gradient(135deg,#14b8a6,#06b6d4,#3b82f6)",
  }),
  createTheme({
    id: "velvet",
    name: "Velvet",
    mode: "dark",
    base: "#130715",
    primary: "#db2777",
    accent: "#be185d",
    warm: "#f9a8d4",
    ownBubble: "linear-gradient(135deg,#be185d,#db2777,#2563eb)",
  }),
  createTheme({
    id: "midnight",
    name: "Midnight",
    mode: "dark",
    base: "#040712",
    primary: "#2563eb",
    accent: "#64748b",
    warm: "#93c5fd",
    ownBubble: "linear-gradient(135deg,#334155,#2563eb,#38bdf8)",
  }),
  createTheme({
    id: "emerald",
    name: "Emerald",
    mode: "dark",
    base: "#03130f",
    primary: "#10b981",
    accent: "#059669",
    warm: "#6ee7b7",
    ownBubble: "linear-gradient(135deg,#059669,#10b981,#22c55e)",
  }),
  createTheme({
    id: "sapphire",
    name: "Sapphire",
    mode: "dark",
    base: "#04101f",
    primary: "#2563eb",
    accent: "#06b6d4",
    warm: "#93c5fd",
    ownBubble: "linear-gradient(135deg,#1d4ed8,#2563eb,#06b6d4)",
  }),
  createTheme({
    id: "citrus",
    name: "Citrus",
    mode: "light",
    base: "#fff7ed",
    primary: "#f97316",
    accent: "#84cc16",
    warm: "#f59e0b",
    ownBubble: "linear-gradient(135deg,#f97316,#f59e0b,#84cc16)",
  }),
  createTheme({
    id: "pearl",
    name: "Pearl",
    mode: "light",
    base: "#f8fafc",
    primary: "#2563eb",
    accent: "#06b6d4",
    warm: "#14b8a6",
    ownBubble: "linear-gradient(135deg,#2563eb,#06b6d4,#14b8a6)",
  }),
  createTheme({
    id: "mono",
    name: "Mono",
    mode: "dark",
    base: "#09090b",
    primary: "#71717a",
    accent: "#a1a1aa",
    warm: "#d4d4d8",
    ownBubble: "linear-gradient(135deg,#52525b,#71717a,#a1a1aa)",
  }),
  createTheme({
    id: "roseglass",
    name: "Rose Glass",
    mode: "dark",
    base: "#120711",
    primary: "#f43f5e",
    accent: "#38bdf8",
    warm: "#fda4af",
    ownBubble: "linear-gradient(135deg,#e11d48,#f43f5e,#38bdf8)",
  }),
  createTheme({
    id: "ice",
    name: "Ice",
    mode: "light",
    base: "#eff6ff",
    primary: "#2563eb",
    accent: "#38bdf8",
    warm: "#60a5fa",
    ownBubble: "linear-gradient(135deg,#2563eb,#38bdf8,#60a5fa)",
  }),
  createTheme({
    id: "gold",
    name: "Gold",
    mode: "dark",
    base: "#120f05",
    primary: "#eab308",
    accent: "#f97316",
    warm: "#fde047",
    ownBubble: "linear-gradient(135deg,#a16207,#eab308,#f97316)",
  }),
  createTheme({
    id: "hologram",
    name: "Hologram",
    mode: "dark",
    base: "#041014",
    primary: "#22d3ee",
    accent: "#38bdf8",
    warm: "#a7f3d0",
    ownBubble: "linear-gradient(135deg,#22d3ee,#a7f3d0,#38bdf8)",
  }),
];

export function getChatTheme(themeId?: string | null) {
  return (
    CHAT_THEMES.find((theme) => theme.id === themeId) ??
    CHAT_THEMES.find((theme) => theme.id === DEFAULT_CHAT_THEME_ID) ??
    CHAT_THEMES[0]
  );
}

export function getStoredChatThemeId() {
  if (typeof window === "undefined") {
    return DEFAULT_CHAT_THEME_ID;
  }

  try {
    return window.localStorage.getItem(APP_THEME_STORAGE_KEY) ?? DEFAULT_CHAT_THEME_ID;
  } catch {
    return DEFAULT_CHAT_THEME_ID;
  }
}

export function getChatThemeStyle(theme: ChatTheme) {
  return {
    "--fc-color-scheme": theme.mode,
    "--fc-theme-id": theme.id,
    "--fc-primary": theme.primary,
    "--fc-primary-rgb": rgbTriplet(theme.primary),
    "--fc-primary-hover": theme.primaryHover,
    "--fc-accent": theme.accent,
    "--fc-accent-rgb": rgbTriplet(theme.accent),
    "--fc-accent-soft": theme.accentSoft,
    "--fc-accent-muted": theme.accentMuted,
    "--fc-accent-text": theme.accentText,
    "--fc-theme-accent": theme.primary,
    "--fc-theme-text": theme.text,
    "--fc-theme-muted": theme.mutedText,
    "--fc-text": theme.text,
    "--fc-text-muted": theme.mutedText,
    "--fc-text-subtle": theme.subtleText,
    "--fc-app-bg": theme.appBackground,
    "--fc-app-panel": theme.panel,
    "--fc-app-panel-strong": theme.panelStrong,
    "--fc-app-surface": theme.surface,
    "--fc-app-surface-hover": theme.surfaceHover,
    "--fc-app-surface-active": theme.surfaceActive,
    "--fc-app-elevated": theme.elevated,
    "--fc-app-border": theme.border,
    "--fc-app-border-strong": theme.borderStrong,
    "--fc-chat-bg": `radial-gradient(circle at 12% 0%, ${theme.accentSoft}, transparent 32%), ${theme.background}`,
    "--fc-chat-header": theme.header,
    "--fc-chat-composer": theme.composer,
    "--fc-own-bubble": theme.ownBubble,
    "--fc-own-bubble-text": theme.ownBubbleText,
    "--fc-their-bubble": theme.theirBubble,
    "--fc-their-bubble-text": theme.theirBubbleText,
    "--fc-input-bg": theme.input,
    "--fc-input-focus": theme.inputFocus,
    "--fc-overlay": theme.overlay,
    "--fc-overlay-strong": theme.overlayStrong,
    "--fc-modal": theme.modal,
    "--fc-skeleton": theme.skeleton,
    "--fc-selection": theme.selection,
    "--fc-focus-ring": theme.focusRing,
    "--fc-story-gradient": theme.storyGradient,
    "--fc-brand-gradient": theme.brandGradient,
    "--fc-avatar-bg": theme.avatar,
    "--fc-shadow-color": theme.shadow,
    "--fc-scrollbar": theme.scrollbar,
    "--fc-divider": theme.border,
    "--fc-success": "#4ba3e3",
    "--fc-warning": "#f59e0b",
    "--fc-danger": "#ef4444",
    "--flexchat-bg": theme.background,
    "--flexchat-panel": theme.panel,
    "--flexchat-border": theme.border,
  } as CSSProperties;
}

export function applyGlobalChatTheme(themeId?: string | null) {
  if (typeof document === "undefined") {
    return getChatTheme(themeId);
  }

  const theme = getChatTheme(themeId);
  const style = getChatThemeStyle(theme);
  const root = document.documentElement;

  Object.entries(style).forEach(([key, value]) => {
    root.style.setProperty(key, String(value));
  });
  root.dataset.flexchatTheme = theme.id;
  root.dataset.flexchatThemeMode = theme.mode;
  root.style.colorScheme = theme.mode;

  try {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme.id);
  } catch {
    return theme;
  }

  return theme;
}

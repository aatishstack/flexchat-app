import type { CSSProperties } from "react";

export type ChatTheme = {
  id: string;
  name: string;
  mode: "dark" | "light";
  background: string;
  header: string;
  composer: string;
  ownBubble: string;
  theirBubble: string;
  accent: string;
  text: string;
  mutedText: string;
};

export const DEFAULT_CHAT_THEME_ID = "flex-purple";

export const CHAT_THEMES: ChatTheme[] = [
  ["flex-purple", "Flex Purple", "dark", "#050816", "rgba(8,17,31,0.72)", "rgba(255,255,255,0.055)", "linear-gradient(135deg,#7c3aed,#9333ea,#d946ef)", "rgba(255,255,255,0.058)", "#c084fc"],
  ["aurora", "Aurora", "dark", "#04111d", "rgba(6,22,35,0.76)", "rgba(125,211,252,0.08)", "linear-gradient(135deg,#14b8a6,#06b6d4,#8b5cf6)", "rgba(255,255,255,0.06)", "#67e8f9"],
  ["velvet", "Velvet", "dark", "#130715", "rgba(28,10,31,0.78)", "rgba(244,114,182,0.08)", "linear-gradient(135deg,#be185d,#db2777,#7c3aed)", "rgba(255,255,255,0.06)", "#f9a8d4"],
  ["midnight", "Midnight", "dark", "#040712", "rgba(8,13,27,0.78)", "rgba(148,163,184,0.08)", "linear-gradient(135deg,#334155,#2563eb,#7c3aed)", "rgba(255,255,255,0.055)", "#93c5fd"],
  ["emerald", "Emerald", "dark", "#03130f", "rgba(5,31,24,0.78)", "rgba(16,185,129,0.08)", "linear-gradient(135deg,#059669,#10b981,#22c55e)", "rgba(255,255,255,0.055)", "#6ee7b7"],
  ["sapphire", "Sapphire", "dark", "#04101f", "rgba(6,18,35,0.8)", "rgba(59,130,246,0.08)", "linear-gradient(135deg,#1d4ed8,#2563eb,#06b6d4)", "rgba(255,255,255,0.055)", "#93c5fd"],
  ["roseglass", "Rose Glass", "dark", "#120711", "rgba(33,13,31,0.78)", "rgba(251,113,133,0.08)", "linear-gradient(135deg,#e11d48,#f43f5e,#a855f7)", "rgba(255,255,255,0.058)", "#fda4af"],
  ["citrus", "Citrus", "light", "#fff7ed", "rgba(255,247,237,0.84)", "rgba(255,255,255,0.72)", "linear-gradient(135deg,#f97316,#f59e0b,#84cc16)", "rgba(15,23,42,0.07)", "#ea580c"],
  ["pearl", "Pearl", "light", "#f8fafc", "rgba(248,250,252,0.88)", "rgba(255,255,255,0.82)", "linear-gradient(135deg,#8b5cf6,#06b6d4,#14b8a6)", "rgba(15,23,42,0.065)", "#7c3aed"],
  ["mono", "Mono", "dark", "#09090b", "rgba(24,24,27,0.78)", "rgba(255,255,255,0.06)", "linear-gradient(135deg,#52525b,#71717a,#a1a1aa)", "rgba(255,255,255,0.06)", "#d4d4d8"],
  ["ocean", "Ocean", "dark", "#03131f", "rgba(6,23,37,0.78)", "rgba(34,211,238,0.08)", "linear-gradient(135deg,#0284c7,#0ea5e9,#22d3ee)", "rgba(255,255,255,0.055)", "#7dd3fc"],
  ["sunset", "Sunset", "dark", "#170b12", "rgba(38,17,28,0.78)", "rgba(251,146,60,0.08)", "linear-gradient(135deg,#ea580c,#f97316,#d946ef)", "rgba(255,255,255,0.06)", "#fdba74"],
  ["forest", "Forest", "dark", "#06130a", "rgba(8,31,16,0.78)", "rgba(34,197,94,0.08)", "linear-gradient(135deg,#166534,#16a34a,#14b8a6)", "rgba(255,255,255,0.055)", "#86efac"],
  ["lavender", "Lavender", "light", "#faf5ff", "rgba(250,245,255,0.86)", "rgba(255,255,255,0.76)", "linear-gradient(135deg,#a855f7,#c084fc,#f0abfc)", "rgba(88,28,135,0.08)", "#9333ea"],
  ["graphite", "Graphite", "dark", "#0a0d12", "rgba(16,21,30,0.8)", "rgba(255,255,255,0.055)", "linear-gradient(135deg,#475569,#64748b,#8b5cf6)", "rgba(255,255,255,0.052)", "#cbd5e1"],
  ["ruby", "Ruby", "dark", "#16060a", "rgba(37,10,16,0.78)", "rgba(244,63,94,0.08)", "linear-gradient(135deg,#9f1239,#e11d48,#fb7185)", "rgba(255,255,255,0.055)", "#fda4af"],
  ["mint", "Mint", "light", "#f0fdfa", "rgba(240,253,250,0.84)", "rgba(255,255,255,0.76)", "linear-gradient(135deg,#0d9488,#2dd4bf,#22c55e)", "rgba(15,118,110,0.08)", "#0f766e"],
  ["ice", "Ice", "light", "#eff6ff", "rgba(239,246,255,0.86)", "rgba(255,255,255,0.78)", "linear-gradient(135deg,#2563eb,#38bdf8,#818cf8)", "rgba(30,64,175,0.075)", "#2563eb"],
  ["plasma", "Plasma", "dark", "#100619", "rgba(25,9,38,0.78)", "rgba(168,85,247,0.08)", "linear-gradient(135deg,#6d28d9,#a21caf,#e11d48)", "rgba(255,255,255,0.058)", "#e879f9"],
  ["cobalt", "Cobalt", "dark", "#050b1b", "rgba(9,18,43,0.78)", "rgba(96,165,250,0.08)", "linear-gradient(135deg,#1e40af,#3b82f6,#8b5cf6)", "rgba(255,255,255,0.055)", "#93c5fd"],
  ["neon", "Neon", "dark", "#05020d", "rgba(13,8,24,0.8)", "rgba(217,70,239,0.09)", "linear-gradient(135deg,#22d3ee,#a855f7,#f43f5e)", "rgba(255,255,255,0.06)", "#f0abfc"],
  ["linen", "Linen", "light", "#fffaf0", "rgba(255,250,240,0.86)", "rgba(255,255,255,0.74)", "linear-gradient(135deg,#d97706,#f59e0b,#a855f7)", "rgba(120,53,15,0.075)", "#b45309"],
  ["amethyst", "Amethyst", "dark", "#0d0617", "rgba(20,11,34,0.78)", "rgba(167,139,250,0.08)", "linear-gradient(135deg,#7e22ce,#8b5cf6,#c084fc)", "rgba(255,255,255,0.055)", "#c4b5fd"],
  ["tealnight", "Teal Night", "dark", "#031515", "rgba(5,32,32,0.78)", "rgba(45,212,191,0.08)", "linear-gradient(135deg,#0f766e,#14b8a6,#06b6d4)", "rgba(255,255,255,0.055)", "#5eead4"],
  ["blush", "Blush", "light", "#fff1f2", "rgba(255,241,242,0.86)", "rgba(255,255,255,0.76)", "linear-gradient(135deg,#f43f5e,#fb7185,#a855f7)", "rgba(159,18,57,0.075)", "#e11d48"],
  ["steel", "Steel", "dark", "#071016", "rgba(10,25,35,0.8)", "rgba(125,211,252,0.07)", "linear-gradient(135deg,#0f172a,#64748b,#06b6d4)", "rgba(255,255,255,0.055)", "#bae6fd"],
  ["violetmist", "Violet Mist", "light", "#f5f3ff", "rgba(245,243,255,0.86)", "rgba(255,255,255,0.78)", "linear-gradient(135deg,#7c3aed,#a78bfa,#22d3ee)", "rgba(91,33,182,0.075)", "#7c3aed"],
  ["gold", "Gold", "dark", "#120f05", "rgba(29,24,9,0.78)", "rgba(250,204,21,0.08)", "linear-gradient(135deg,#a16207,#eab308,#f97316)", "rgba(255,255,255,0.055)", "#fde047"],
  ["crimson", "Crimson", "dark", "#150606", "rgba(35,12,12,0.78)", "rgba(248,113,113,0.08)", "linear-gradient(135deg,#991b1b,#dc2626,#fb7185)", "rgba(255,255,255,0.055)", "#fca5a5"],
  ["skyline", "Skyline", "light", "#ecfeff", "rgba(236,254,255,0.86)", "rgba(255,255,255,0.76)", "linear-gradient(135deg,#0891b2,#06b6d4,#6366f1)", "rgba(8,145,178,0.075)", "#0891b2"],
  ["orchid", "Orchid", "dark", "#14051a", "rgba(33,9,43,0.78)", "rgba(216,180,254,0.08)", "linear-gradient(135deg,#86198f,#c026d3,#8b5cf6)", "rgba(255,255,255,0.055)", "#e9d5ff"],
  ["holo", "Hologram", "dark", "#041014", "rgba(7,24,30,0.78)", "rgba(255,255,255,0.07)", "linear-gradient(135deg,#22d3ee,#a7f3d0,#c084fc)", "rgba(255,255,255,0.055)", "#a7f3d0"],
].map(
  ([
    id,
    name,
    mode,
    background,
    header,
    composer,
    ownBubble,
    theirBubble,
    accent,
  ]) => ({
    id,
    name,
    mode: mode as ChatTheme["mode"],
    background,
    header,
    composer,
    ownBubble,
    theirBubble,
    accent,
    text: mode === "light" ? "#111827" : "#ffffff",
    mutedText:
      mode === "light"
        ? "rgba(55,65,81,0.72)"
        : "rgba(212,212,216,0.72)",
  }),
);

export function getChatTheme(themeId?: string | null) {
  return (
    CHAT_THEMES.find((theme) => theme.id === themeId) ??
    CHAT_THEMES.find((theme) => theme.id === DEFAULT_CHAT_THEME_ID) ??
    CHAT_THEMES[0]
  );
}

export function getChatThemeStyle(theme: ChatTheme) {
  return {
    "--fc-chat-bg": theme.background,
    "--fc-chat-header": theme.header,
    "--fc-chat-composer": theme.composer,
    "--fc-own-bubble": theme.ownBubble,
    "--fc-their-bubble": theme.theirBubble,
    "--fc-theme-accent": theme.accent,
    "--fc-theme-text": theme.text,
    "--fc-theme-muted": theme.mutedText,
  } as CSSProperties;
}

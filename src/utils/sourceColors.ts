/**
 * Deterministic color palette for revenue/expense source badges.
 * Each source name always maps to the same color across the entire app.
 *
 * Light mode: outlined badges with tinted border and text, near-white bg.
 * Dark mode: subtle filled badges with muted tones.
 */

const UNCATEGORIZED_STYLE = {
  light: { bg: "transparent", text: "hsl(220, 10%, 50%)", border: "hsl(220, 12%, 78%)" },
  dark: { bg: "hsl(220, 12%, 16%)", text: "hsl(220, 10%, 62%)", border: "hsl(220, 12%, 28%)" },
};

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
  hash = ((hash >> 16) ^ hash) * 0x45d9f3b;
  hash = (hash >> 16) ^ hash;
  return hash >>> 0;
}

export function getSourceColor(name: string | null | undefined, isDark?: boolean): { bg: string; text: string; border: string } {
  if (isDark === undefined) {
    isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  }
  if (!name || name === "Uncategorized") {
    return isDark ? UNCATEGORIZED_STYLE.dark : UNCATEGORIZED_STYLE.light;
  }
  const hue = hashString(name) % 360;
  if (isDark) {
    // Dark: subtle filled with moderate contrast
    return {
      bg: `hsl(${hue}, 30%, 15%)`,
      text: `hsl(${hue}, 50%, 68%)`,
      border: `hsl(${hue}, 35%, 28%)`,
    };
  }
  // Light: outlined with subtle tinted background
  return {
    bg: `hsl(${hue}, 50%, 96%)`,
    text: `hsl(${hue}, 55%, 35%)`,
    border: `hsl(${hue}, 45%, 70%)`,
  };
}

export function getSourceBadgeStyle(name: string | null | undefined, isDark?: boolean): React.CSSProperties {
  const c = getSourceColor(name, isDark);
  return {
    backgroundColor: c.bg,
    color: c.text,
    borderColor: c.border,
    borderWidth: "1px",
    borderStyle: "solid",
  };
}

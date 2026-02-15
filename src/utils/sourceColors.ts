/**
 * Deterministic color palette for revenue/expense source badges.
 * Each source name always maps to the same color across the entire app.
 */

const UNCATEGORIZED_STYLE = {
  light: { bg: "hsl(220, 15%, 92%)", text: "hsl(220, 10%, 45%)", border: "hsl(220, 15%, 75%)" },
  dark: { bg: "hsl(220, 15%, 20%)", text: "hsl(220, 10%, 65%)", border: "hsl(220, 15%, 35%)" },
};

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  // Mix the bits for better distribution
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
    return {
      bg: `hsl(${hue}, 45%, 20%)`,
      text: `hsl(${hue}, 70%, 70%)`,
      border: `hsl(${hue}, 45%, 35%)`,
    };
  }
  return {
    bg: `hsl(${hue}, 70%, 92%)`,
    text: `hsl(${hue}, 70%, 35%)`,
    border: `hsl(${hue}, 60%, 65%)`,
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

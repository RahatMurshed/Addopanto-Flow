/**
 * Deterministic color palette for revenue/expense source badges.
 * Each source name always maps to the same color across the entire app.
 *
 * Light mode: outlined badges with tinted border and text, near-white bg.
 * Dark mode: subtle filled badges with muted tones.
 */

const UNCATEGORIZED_STYLE = {
  light: { bg: "transparent", text: "hsl(220, 25%, 45%)", border: "hsla(220, 30%, 50%, 0.25)" },
  dark: { bg: "transparent", text: "hsl(220, 60%, 70%)", border: "hsla(220, 60%, 65%, 0.50)" },
};

/** Named overrides for specific source badges */
const NAMED_OVERRIDES: Record<string, { light: { bg: string; text: string; border: string }; dark: { bg: string; text: string; border: string } }> = {
  "Student Fees": {
    light: { bg: "transparent", text: "hsl(180, 70%, 35%)", border: "hsla(180, 65%, 45%, 0.45)" },
    dark: { bg: "transparent", text: "hsl(180, 90%, 65%)", border: "hsla(180, 90%, 60%, 0.50)" },
  },
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
  if (name in NAMED_OVERRIDES) {
    return isDark ? NAMED_OVERRIDES[name].dark : NAMED_OVERRIDES[name].light;
  }
  const hue = hashString(name) % 360;
  if (isDark) {
    // Dark: neon outlined – vivid text on transparent bg
    return {
      bg: "transparent",
      text: `hsl(${hue}, 90%, 65%)`,
      border: `hsla(${hue}, 90%, 60%, 0.50)`,
    };
  }
  // Light: vivid but readable text, no background
  return {
    bg: "transparent",
    text: `hsl(${hue}, 70%, 35%)`,
    border: `hsla(${hue}, 65%, 45%, 0.45)`,
  };
}

export function cleanSalaryTag(desc: string | null | undefined): string {
  if (!desc) return "";
  return desc.replace(/\s*\[SALARY:[^\]]+\]/g, "").trim();
}

export function getSourceBadgeStyle(name: string | null | undefined, isDark?: boolean): React.CSSProperties {
  const c = getSourceColor(name, isDark);
  return {
    backgroundColor: c.bg,
    color: c.text,
    borderColor: c.border,
    borderWidth: "1px",
    borderStyle: "solid",
    fontWeight: 700,
  };
}

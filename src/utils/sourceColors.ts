/**
 * Deterministic color palette for revenue/expense source badges.
 * Each source name always maps to the same color across the entire app.
 */

const SOURCE_COLOR_PALETTE = [
  { bg: "hsl(210, 80%, 92%)", text: "hsl(210, 80%, 40%)", border: "hsl(210, 80%, 70%)" },  // blue
  { bg: "hsl(150, 70%, 90%)", text: "hsl(150, 70%, 30%)", border: "hsl(150, 70%, 60%)" },  // green
  { bg: "hsl(280, 60%, 92%)", text: "hsl(280, 60%, 40%)", border: "hsl(280, 60%, 65%)" },  // purple
  { bg: "hsl(30, 80%, 90%)",  text: "hsl(30, 80%, 35%)",  border: "hsl(30, 80%, 60%)" },   // orange
  { bg: "hsl(340, 70%, 92%)", text: "hsl(340, 70%, 40%)", border: "hsl(340, 70%, 65%)" },  // pink
  { bg: "hsl(180, 60%, 90%)", text: "hsl(180, 60%, 30%)", border: "hsl(180, 60%, 55%)" },  // teal
  { bg: "hsl(50, 80%, 90%)",  text: "hsl(50, 80%, 30%)",  border: "hsl(50, 80%, 55%)" },   // yellow
  { bg: "hsl(0, 70%, 92%)",   text: "hsl(0, 70%, 40%)",   border: "hsl(0, 70%, 65%)" },    // red
  { bg: "hsl(240, 50%, 92%)", text: "hsl(240, 50%, 40%)", border: "hsl(240, 50%, 65%)" },  // indigo
  { bg: "hsl(100, 50%, 90%)", text: "hsl(100, 50%, 30%)", border: "hsl(100, 50%, 55%)" },  // lime
];

const DARK_SOURCE_COLOR_PALETTE = [
  { bg: "hsl(210, 60%, 20%)", text: "hsl(210, 80%, 70%)", border: "hsl(210, 60%, 35%)" },
  { bg: "hsl(150, 50%, 18%)", text: "hsl(150, 70%, 65%)", border: "hsl(150, 50%, 30%)" },
  { bg: "hsl(280, 40%, 20%)", text: "hsl(280, 60%, 70%)", border: "hsl(280, 40%, 35%)" },
  { bg: "hsl(30, 60%, 18%)",  text: "hsl(30, 80%, 65%)",  border: "hsl(30, 60%, 30%)" },
  { bg: "hsl(340, 50%, 20%)", text: "hsl(340, 70%, 70%)", border: "hsl(340, 50%, 35%)" },
  { bg: "hsl(180, 40%, 18%)", text: "hsl(180, 60%, 65%)", border: "hsl(180, 40%, 30%)" },
  { bg: "hsl(50, 60%, 18%)",  text: "hsl(50, 80%, 65%)",  border: "hsl(50, 60%, 30%)" },
  { bg: "hsl(0, 50%, 20%)",   text: "hsl(0, 70%, 70%)",   border: "hsl(0, 50%, 35%)" },
  { bg: "hsl(240, 35%, 20%)", text: "hsl(240, 50%, 70%)", border: "hsl(240, 35%, 35%)" },
  { bg: "hsl(100, 35%, 18%)", text: "hsl(100, 50%, 65%)", border: "hsl(100, 35%, 30%)" },
];

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
  const palette = isDark ? DARK_SOURCE_COLOR_PALETTE : SOURCE_COLOR_PALETTE;
  return palette[hashString(name) % palette.length];
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

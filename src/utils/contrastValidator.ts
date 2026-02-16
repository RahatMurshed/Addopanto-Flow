/**
 * Contrast-aware color palette validator.
 * Parses HSL design tokens, computes WCAG 2.1 contrast ratios,
 * and auto-adjusts lightness to meet the target ratio (AA = 4.5:1).
 */

// ── HSL ↔ Relative Luminance helpers ────────────────────────────

interface HSL {
  h: number;
  s: number;
  l: number;
}

/** Parse a CSS custom-property value like "30 100% 42%" into {h,s,l}. */
export function parseHSL(raw: string): HSL | null {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  if ([h, s, l].some(Number.isNaN)) return null;
  return { h, s, l };
}

export function hslToString({ h, s, l }: HSL): string {
  return `${h} ${s}% ${l}%`;
}

/** Convert HSL (s, l in 0-100) to linear-sRGB [0,1]. */
function hslToRGB({ h, s, l }: HSL): [number, number, number] {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [r + m, g + m, b + m];
}

/** sRGB channel → linear value for luminance calc. */
function linearize(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance. */
export function relativeLuminance(color: HSL): number {
  const [r, g, b] = hslToRGB(color).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (always ≥ 1). */
export function contrastRatio(a: HSL, b: HSL): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Token pair definitions ──────────────────────────────────────

export interface TokenPair {
  /** CSS variable name for the foreground color */
  fg: string;
  /** CSS variable name for the background color */
  bg: string;
  /** Minimum WCAG contrast ratio (default 4.5 = AA normal text) */
  minRatio?: number;
}

/** All semantic token pairs that must maintain readable contrast. */
export const SEMANTIC_PAIRS: TokenPair[] = [
  { fg: "--foreground", bg: "--background" },
  { fg: "--card-foreground", bg: "--card" },
  { fg: "--popover-foreground", bg: "--popover" },
  { fg: "--primary-foreground", bg: "--primary" },
  { fg: "--secondary-foreground", bg: "--secondary" },
  { fg: "--muted-foreground", bg: "--muted", minRatio: 4.5 },
  { fg: "--accent-foreground", bg: "--accent" },
  { fg: "--destructive-foreground", bg: "--destructive" },
  { fg: "--success-foreground", bg: "--success" },
  { fg: "--warning-foreground", bg: "--warning" },
  { fg: "--sidebar-foreground", bg: "--sidebar-background" },
  { fg: "--sidebar-primary-foreground", bg: "--sidebar-primary" },
  { fg: "--sidebar-accent-foreground", bg: "--sidebar-accent" },
];

// ── Auto-adjustment logic ───────────────────────────────────────

export interface ContrastIssue {
  pair: TokenPair;
  ratio: number;
  required: number;
  adjusted: boolean;
  newFgValue?: string;
}

/**
 * Read a CSS custom property from the document root or a given element.
 */
function getTokenValue(name: string, el?: Element): string | null {
  const target = el ?? document.documentElement;
  const val = getComputedStyle(target).getPropertyValue(name).trim();
  return val || null;
}

/**
 * Adjust the foreground lightness to meet the target contrast ratio.
 * Returns null if already passing, otherwise the corrected HSL.
 */
export function adjustForContrast(
  fg: HSL,
  bg: HSL,
  targetRatio: number
): HSL | null {
  if (contrastRatio(fg, bg) >= targetRatio - 0.01) return null;

  const bgLum = relativeLuminance(bg);
  // Decide direction: if bg is dark, lighten fg; if bg is light, darken fg.
  const shouldLighten = bgLum < 0.5;

  let lo = shouldLighten ? fg.l : 0;
  let hi = shouldLighten ? 100 : fg.l;
  let best: HSL = { ...fg };

  // Binary search for the minimal lightness change that meets the ratio
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const candidate: HSL = { ...fg, l: mid };
    const cr = contrastRatio(candidate, bg);
    if (cr >= targetRatio) {
      best = candidate;
      // Try to stay closer to the original lightness
      if (shouldLighten) hi = mid;
      else lo = mid;
    } else {
      if (shouldLighten) lo = mid;
      else hi = mid;
    }
  }

  // Round to 1 decimal
  best.l = Math.round(best.l * 10) / 10;
  return best;
}

/**
 * Validate all semantic token pairs and auto-fix any that fail WCAG AA.
 * Applies fixes directly to `document.documentElement.style`.
 *
 * @returns Array of issues found (with `adjusted: true` if auto-fixed).
 */
export function validateAndFixContrast(el?: Element): ContrastIssue[] {
  if (typeof document === "undefined") return [];

  const issues: ContrastIssue[] = [];

  for (const pair of SEMANTIC_PAIRS) {
    const fgRaw = getTokenValue(pair.fg, el);
    const bgRaw = getTokenValue(pair.bg, el);
    if (!fgRaw || !bgRaw) continue;

    const fgHSL = parseHSL(fgRaw);
    const bgHSL = parseHSL(bgRaw);
    if (!fgHSL || !bgHSL) continue;

    const required = pair.minRatio ?? 4.5;
    const ratio = contrastRatio(fgHSL, bgHSL);

    if (ratio < required) {
      const fixed = adjustForContrast(fgHSL, bgHSL, required);
      if (fixed) {
        const newValue = hslToString(fixed);
        document.documentElement.style.setProperty(pair.fg, newValue);
        issues.push({ pair, ratio, required, adjusted: true, newFgValue: newValue });
      } else {
        issues.push({ pair, ratio, required, adjusted: false });
      }
    }
  }

  return issues;
}

/**
 * Get a full contrast audit without modifying anything.
 */
export function auditContrast(el?: Element): Array<{
  pair: TokenPair;
  ratio: number;
  passes: boolean;
  grade: "AAA" | "AA" | "AA-large" | "fail";
}> {
  if (typeof document === "undefined") return [];

  return SEMANTIC_PAIRS.map((pair) => {
    const fgRaw = getTokenValue(pair.fg, el);
    const bgRaw = getTokenValue(pair.bg, el);
    if (!fgRaw || !bgRaw) return { pair, ratio: 0, passes: false, grade: "fail" as const };

    const fgHSL = parseHSL(fgRaw);
    const bgHSL = parseHSL(bgRaw);
    if (!fgHSL || !bgHSL) return { pair, ratio: 0, passes: false, grade: "fail" as const };

    const ratio = contrastRatio(fgHSL, bgHSL);
    const required = pair.minRatio ?? 4.5;
    const grade = ratio >= 7 ? "AAA" as const : ratio >= 4.5 ? "AA" as const : ratio >= 3 ? "AA-large" as const : "fail" as const;

    return { pair, ratio: Math.round(ratio * 100) / 100, passes: ratio >= required, grade };
  });
}

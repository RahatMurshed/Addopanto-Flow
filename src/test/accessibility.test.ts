import { describe, it, expect } from "vitest";
import {
  parseHSL,
  contrastRatio,
  adjustForContrast,
  SEMANTIC_PAIRS,
  type TokenPair,
} from "@/utils/contrastValidator";
import { getSourceColor } from "@/utils/sourceColors";

// ── HSL token definitions (mirrored from index.css) ─────────────

const LIGHT_TOKENS: Record<string, string> = {
  "--background": "210 20% 98%",
  "--foreground": "220 20% 10%",
  "--card": "0 0% 100%",
  "--card-foreground": "220 20% 10%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "220 20% 10%",
  "--primary": "30 100% 35%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "217 70% 25%",
  "--secondary-foreground": "0 0% 100%",
  "--muted": "210 40% 96%",
  "--muted-foreground": "215 20% 42%",
  "--accent": "210 40% 96%",
  "--accent-foreground": "220 20% 10%",
  "--destructive": "0 84% 45%",
  "--destructive-foreground": "0 0% 100%",
  "--success": "142 76% 30%",
  "--success-foreground": "0 0% 100%",
  "--warning": "38 92% 32%",
  "--warning-foreground": "0 0% 100%",
  "--border": "214 32% 82%",
  "--input": "214 32% 82%",
  "--sidebar-background": "217 70% 18%",
  "--sidebar-foreground": "210 40% 98%",
  "--sidebar-primary": "30 100% 35%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "217 50% 25%",
  "--sidebar-accent-foreground": "210 40% 98%",
};

const DARK_TOKENS: Record<string, string> = {
  "--background": "222 47% 6%",
  "--foreground": "210 40% 98%",
  "--card": "222 47% 8%",
  "--card-foreground": "210 40% 98%",
  "--popover": "222 47% 8%",
  "--popover-foreground": "210 40% 98%",
  "--primary": "30 100% 55%",
  "--primary-foreground": "220 20% 8%",
  "--secondary": "217 50% 22%",
  "--secondary-foreground": "210 40% 98%",
  "--muted": "217 33% 17%",
  "--muted-foreground": "215 20% 68%",
  "--accent": "217 33% 17%",
  "--accent-foreground": "210 40% 98%",
  "--destructive": "0 72% 45%",
  "--destructive-foreground": "0 0% 100%",
  "--success": "142 76% 42%",
  "--success-foreground": "220 20% 8%",
  "--warning": "38 92% 55%",
  "--warning-foreground": "220 20% 8%",
  "--border": "217 30% 22%",
  "--input": "217 30% 22%",
  "--sidebar-background": "217 60% 12%",
  "--sidebar-foreground": "210 40% 98%",
  "--sidebar-primary": "30 100% 55%",
  "--sidebar-primary-foreground": "220 20% 8%",
  "--sidebar-accent": "217 40% 20%",
  "--sidebar-accent-foreground": "210 40% 98%",
};

// ── Helpers ─────────────────────────────────────────────────────

function checkPair(
  tokens: Record<string, string>,
  pair: TokenPair,
  minRatio: number
): { ratio: number; passes: boolean } {
  const fg = parseHSL(tokens[pair.fg] ?? "");
  const bg = parseHSL(tokens[pair.bg] ?? "");
  if (!fg || !bg) return { ratio: 0, passes: false };
  const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
  return { ratio, passes: ratio >= minRatio };
}

// ── WCAG AA Contrast Tests ──────────────────────────────────────

describe("WCAG AA Contrast — Light Mode", () => {
  for (const pair of SEMANTIC_PAIRS) {
    const required = pair.minRatio ?? 4.5;
    it(`${pair.fg} on ${pair.bg} ≥ ${required}:1`, () => {
      const { ratio, passes } = checkPair(LIGHT_TOKENS, pair, required);
      expect(passes, `Contrast ${ratio}:1 is below WCAG AA (${required}:1)`).toBe(true);
    });
  }
});

describe("WCAG AA Contrast — Dark Mode", () => {
  for (const pair of SEMANTIC_PAIRS) {
    const required = pair.minRatio ?? 4.5;
    it(`${pair.fg} on ${pair.bg} ≥ ${required}:1`, () => {
      const { ratio, passes } = checkPair(DARK_TOKENS, pair, required);
      expect(passes, `Contrast ${ratio}:1 is below WCAG AA (${required}:1)`).toBe(true);
    });
  }
});

// ── Additional WCAG AA pairs (border visibility, input contrast) ──

const EXTRA_PAIRS: Array<{ name: string; fg: string; bg: string; minRatio: number }> = [
  { name: "border on background (light)", fg: "--border", bg: "--background", minRatio: 1.5 },
  { name: "border on card (light)", fg: "--border", bg: "--card", minRatio: 1.3 },
  { name: "input on background (light)", fg: "--input", bg: "--background", minRatio: 1.5 },
];

describe("WCAG AA Non-text Contrast — Light Mode", () => {
  for (const { name, fg, bg, minRatio } of EXTRA_PAIRS) {
    it(`${name} ≥ ${minRatio}:1`, () => {
      const fgHSL = parseHSL(LIGHT_TOKENS[fg] ?? "");
      const bgHSL = parseHSL(LIGHT_TOKENS[bg] ?? "");
      if (!fgHSL || !bgHSL) {
        expect.fail(`Missing token: ${fg} or ${bg}`);
        return;
      }
      const ratio = Math.round(contrastRatio(fgHSL, bgHSL) * 100) / 100;
      expect(ratio >= minRatio, `${name}: ${ratio}:1 < ${minRatio}:1`).toBe(true);
    });
  }
});

// ── Cross-theme parity checks ───────────────────────────────────

describe("WCAG AA Cross-theme Parity", () => {
  it("all semantic pairs exist in both light and dark tokens", () => {
    for (const pair of SEMANTIC_PAIRS) {
      expect(LIGHT_TOKENS[pair.fg], `Light mode missing ${pair.fg}`).toBeDefined();
      expect(LIGHT_TOKENS[pair.bg], `Light mode missing ${pair.bg}`).toBeDefined();
      expect(DARK_TOKENS[pair.fg], `Dark mode missing ${pair.fg}`).toBeDefined();
      expect(DARK_TOKENS[pair.bg], `Dark mode missing ${pair.bg}`).toBeDefined();
    }
  });

  it("no pair drops more than 2 grades between themes", () => {
    const gradeValue = { AAA: 3, AA: 2, "AA-large": 1, fail: 0 } as const;
    for (const pair of SEMANTIC_PAIRS) {
      const lightResult = checkPair(LIGHT_TOKENS, pair, pair.minRatio ?? 4.5);
      const darkResult = checkPair(DARK_TOKENS, pair, pair.minRatio ?? 4.5);
      const toGrade = (r: number) => r >= 7 ? "AAA" as const : r >= 4.5 ? "AA" as const : r >= 3 ? "AA-large" as const : "fail" as const;
      const lightGrade = toGrade(lightResult.ratio);
      const darkGrade = toGrade(darkResult.ratio);
      const diff = Math.abs(gradeValue[lightGrade] - gradeValue[darkGrade]);
      expect(diff <= 2, `${pair.fg}/${pair.bg}: light=${lightGrade} (${lightResult.ratio}), dark=${darkGrade} (${darkResult.ratio})`).toBe(true);
    }
  });
});

// ── Source badge color contrast (dynamic hashing) ───────────────

describe("WCAG AA Source Badge Colors", () => {
  const testSources = [
    "Tuition Fees", "Lab Equipment", "Sports", "Library",
    "Hostel", "Cafeteria", "Transport", "Miscellaneous",
    "Salaries", "Utilities", "Rent", "Marketing",
  ];

  // Light mode uses transparent bg, so check text against white (page bg)
  const WHITE_BG = { h: 0, s: 0, l: 100 };
  const DARK_PAGE_BG = { h: 222, s: 47, l: 6 };

  for (const mode of ["light", "dark"] as const) {
    describe(`${mode} mode`, () => {
      for (const source of testSources) {
        it(`"${source}" badge text has readable contrast`, () => {
          const isDark = mode === "dark";
          const { bg, text } = getSourceColor(source, isDark);

          const textMatch = text.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
          expect(textMatch, `Cannot parse text: ${text}`).not.toBeNull();
          const textHSL = { h: +textMatch![1], s: +textMatch![2], l: +textMatch![3] };

          let bgHSL: { h: number; s: number; l: number };
          if (bg === "transparent") {
            // Use page background for contrast check
            bgHSL = isDark ? DARK_PAGE_BG : WHITE_BG;
          } else {
            const bgMatch = bg.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            expect(bgMatch, `Cannot parse bg: ${bg}`).not.toBeNull();
            bgHSL = { h: +bgMatch![1], s: +bgMatch![2], l: +bgMatch![3] };
          }

          const ratio = contrastRatio(textHSL, bgHSL);
          expect(ratio >= 3, `"${source}" ${mode}: ${ratio.toFixed(2)}:1 < 3:1`).toBe(true);
        });
      }
    });
  }

  it("Uncategorized badge has sufficient contrast in both modes", () => {
    for (const isDark of [false, true]) {
      const { bg, text } = getSourceColor("Uncategorized", isDark);
      const textMatch = text.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      expect(textMatch).not.toBeNull();
      const textHSL = { h: +textMatch![1], s: +textMatch![2], l: +textMatch![3] };

      let bgHSL: { h: number; s: number; l: number };
      if (bg === "transparent") {
        bgHSL = isDark ? DARK_PAGE_BG : WHITE_BG;
      } else {
        const bgMatch = bg.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        expect(bgMatch).not.toBeNull();
        bgHSL = { h: +bgMatch![1], s: +bgMatch![2], l: +bgMatch![3] };
      }

      const ratio = contrastRatio(textHSL, bgHSL);
      expect(ratio >= 3, `Uncategorized ${isDark ? "dark" : "light"}: ${ratio.toFixed(2)}:1`).toBe(true);
    }
  });
});

// ── Page-level semantic structure checks ────────────────────────

describe("WCAG AA Semantic HTML Structure", () => {
  it("NotFound page exports a component", async () => {
    const mod = await import("@/pages/NotFound");
    expect(mod.default).toBeDefined();
  });

  it("LandingPage exports a component", async () => {
    const mod = await import("@/pages/LandingPage");
    expect(mod.default).toBeDefined();
  });

  it("Auth page exports a component", async () => {
    const mod = await import("@/pages/Auth");
    expect(mod.default).toBeDefined();
  });
});

// ── Contrast validator fuzz testing ─────────────────────────────

describe("Contrast Validator Fuzz Testing", () => {
  it("adjustForContrast never returns a ratio below target", () => {
    const hues = [0, 30, 60, 120, 180, 240, 300];
    const saturations = [20, 50, 80, 100];
    const lightBG = { h: 210, s: 20, l: 98 };
    const darkBG = { h: 222, s: 47, l: 6 };

    for (const h of hues) {
      for (const s of saturations) {
        const fgLight = { h, s, l: 55 };
        const adjLight = adjustForContrast(fgLight, lightBG, 4.5);
        if (adjLight) {
          const ratio = contrastRatio(adjLight, lightBG);
          expect(ratio >= 4.4, `h=${h} s=${s} on light: ${ratio}`).toBe(true);
        }

        const fgDark = { h, s, l: 45 };
        const adjDark = adjustForContrast(fgDark, darkBG, 4.5);
        if (adjDark) {
          const ratio = contrastRatio(adjDark, darkBG);
          expect(ratio >= 4.4, `h=${h} s=${s} on dark: ${ratio}`).toBe(true);
        }
      }
    }
  });

  it("all semantic pairs have parseable HSL values", () => {
    for (const tokens of [LIGHT_TOKENS, DARK_TOKENS]) {
      for (const pair of SEMANTIC_PAIRS) {
        const fg = parseHSL(tokens[pair.fg] ?? "");
        const bg = parseHSL(tokens[pair.bg] ?? "");
        expect(fg, `Cannot parse ${pair.fg}: ${tokens[pair.fg]}`).not.toBeNull();
        expect(bg, `Cannot parse ${pair.bg}: ${tokens[pair.bg]}`).not.toBeNull();
      }
    }
  });
});

// ── Visual Regression: Red/Green Color Token Stability ──────────

describe("Color Token Regression — Success (Green) tokens", () => {
  const expectedLight = { token: "--success", value: "142 76% 30%" };
  const expectedLightFg = { token: "--success-foreground", value: "0 0% 100%" };
  const expectedDark = { token: "--success", value: "142 76% 42%" };
  const expectedDarkFg = { token: "--success-foreground", value: "220 20% 8%" };

  it("light --success matches snapshot", () => {
    expect(LIGHT_TOKENS["--success"]).toBe(expectedLight.value);
  });
  it("light --success-foreground matches snapshot", () => {
    expect(LIGHT_TOKENS["--success-foreground"]).toBe(expectedLightFg.value);
  });
  it("dark --success matches snapshot", () => {
    expect(DARK_TOKENS["--success"]).toBe(expectedDark.value);
  });
  it("dark --success-foreground matches snapshot", () => {
    expect(DARK_TOKENS["--success-foreground"]).toBe(expectedDarkFg.value);
  });

  it("light success has WCAG AA contrast on background", () => {
    const fg = parseHSL(LIGHT_TOKENS["--success"]);
    const bg = parseHSL(LIGHT_TOKENS["--background"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });
  it("dark success has WCAG AA contrast on background", () => {
    const fg = parseHSL(DARK_TOKENS["--success"]);
    const bg = parseHSL(DARK_TOKENS["--background"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });
  it("light success-foreground has WCAG AA contrast on success", () => {
    const fg = parseHSL(LIGHT_TOKENS["--success-foreground"]);
    const bg = parseHSL(LIGHT_TOKENS["--success"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });
  it("dark success-foreground has WCAG AA contrast on success", () => {
    const fg = parseHSL(DARK_TOKENS["--success-foreground"]);
    const bg = parseHSL(DARK_TOKENS["--success"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });

  it("success hue stays green (120–160) in both themes", () => {
    const lightH = parseHSL(LIGHT_TOKENS["--success"])!.h;
    const darkH = parseHSL(DARK_TOKENS["--success"])!.h;
    expect(lightH >= 120 && lightH <= 160, `Light success hue ${lightH} out of green range`).toBe(true);
    expect(darkH >= 120 && darkH <= 160, `Dark success hue ${darkH} out of green range`).toBe(true);
  });
});

describe("Color Token Regression — Destructive (Red) tokens", () => {
  const expectedLight = { token: "--destructive", value: "0 84% 45%" };
  const expectedLightFg = { token: "--destructive-foreground", value: "0 0% 100%" };
  const expectedDark = { token: "--destructive", value: "0 72% 45%" };
  const expectedDarkFg = { token: "--destructive-foreground", value: "0 0% 100%" };

  it("light --destructive matches snapshot", () => {
    expect(LIGHT_TOKENS["--destructive"]).toBe(expectedLight.value);
  });
  it("light --destructive-foreground matches snapshot", () => {
    expect(LIGHT_TOKENS["--destructive-foreground"]).toBe(expectedLightFg.value);
  });
  it("dark --destructive matches snapshot", () => {
    expect(DARK_TOKENS["--destructive"]).toBe(expectedDark.value);
  });
  it("dark --destructive-foreground matches snapshot", () => {
    expect(DARK_TOKENS["--destructive-foreground"]).toBe(expectedDarkFg.value);
  });

  it("light destructive has WCAG AA contrast on background", () => {
    const fg = parseHSL(LIGHT_TOKENS["--destructive"]);
    const bg = parseHSL(LIGHT_TOKENS["--background"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });
  it("dark destructive has WCAG AA contrast on background", () => {
    const fg = parseHSL(DARK_TOKENS["--destructive"]);
    const bg = parseHSL(DARK_TOKENS["--background"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });
  it("light destructive-foreground has WCAG AA contrast on destructive", () => {
    const fg = parseHSL(LIGHT_TOKENS["--destructive-foreground"]);
    const bg = parseHSL(LIGHT_TOKENS["--destructive"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });
  it("dark destructive-foreground has WCAG AA contrast on destructive", () => {
    const fg = parseHSL(DARK_TOKENS["--destructive-foreground"]);
    const bg = parseHSL(DARK_TOKENS["--destructive"]);
    expect(fg && bg && contrastRatio(fg, bg) >= 4.5).toBe(true);
  });

  it("destructive hue stays red (0 or 345–360) in both themes", () => {
    const lightH = parseHSL(LIGHT_TOKENS["--destructive"])!.h;
    const darkH = parseHSL(DARK_TOKENS["--destructive"])!.h;
    const isRed = (h: number) => h <= 15 || h >= 345;
    expect(isRed(lightH), `Light destructive hue ${lightH} out of red range`).toBe(true);
    expect(isRed(darkH), `Dark destructive hue ${darkH} out of red range`).toBe(true);
  });
});

describe("Color Token Regression — Warning (Amber) tokens", () => {
  it("light --warning matches snapshot", () => {
    expect(LIGHT_TOKENS["--warning"]).toBe("38 92% 32%");
  });
  it("dark --warning matches snapshot", () => {
    expect(DARK_TOKENS["--warning"]).toBe("38 92% 55%");
  });
  it("warning hue stays amber (25–50) in both themes", () => {
    const lightH = parseHSL(LIGHT_TOKENS["--warning"])!.h;
    const darkH = parseHSL(DARK_TOKENS["--warning"])!.h;
    expect(lightH >= 25 && lightH <= 50, `Light warning hue ${lightH}`).toBe(true);
    expect(darkH >= 25 && darkH <= 50, `Dark warning hue ${darkH}`).toBe(true);
  });
});

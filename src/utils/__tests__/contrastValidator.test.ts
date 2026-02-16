import { describe, it, expect } from "vitest";
import {
  parseHSL,
  hslToString,
  contrastRatio,
  relativeLuminance,
  adjustForContrast,
} from "@/utils/contrastValidator";

describe("contrastValidator", () => {
  it("parses HSL strings correctly", () => {
    expect(parseHSL("30 100% 42%")).toEqual({ h: 30, s: 100, l: 42 });
    expect(parseHSL("0 0% 100%")).toEqual({ h: 0, s: 0, l: 100 });
    expect(parseHSL("invalid")).toBeNull();
  });

  it("converts HSL back to string", () => {
    expect(hslToString({ h: 30, s: 100, l: 42 })).toBe("30 100% 42%");
  });

  it("computes black vs white contrast ≈ 21:1", () => {
    const black = { h: 0, s: 0, l: 0 };
    const white = { h: 0, s: 0, l: 100 };
    const ratio = contrastRatio(black, white);
    expect(ratio).toBeGreaterThan(20);
    expect(ratio).toBeLessThanOrEqual(21.1);
  });

  it("returns luminance 0 for black, ~1 for white", () => {
    expect(relativeLuminance({ h: 0, s: 0, l: 0 })).toBeCloseTo(0, 2);
    expect(relativeLuminance({ h: 0, s: 0, l: 100 })).toBeCloseTo(1, 2);
  });

  it("adjusts lightness to meet target ratio", () => {
    const fg = { h: 215, s: 20, l: 55 }; // a mid-grey
    const bg = { h: 210, s: 40, l: 96 }; // light bg
    const adjusted = adjustForContrast(fg, bg, 4.5);

    // Should darken the fg
    expect(adjusted).not.toBeNull();
    expect(adjusted!.l).toBeLessThan(fg.l);
    expect(contrastRatio(adjusted!, bg)).toBeGreaterThanOrEqual(4.49);
  });

  it("returns null when already passing", () => {
    const fg = { h: 0, s: 0, l: 0 };
    const bg = { h: 0, s: 0, l: 100 };
    expect(adjustForContrast(fg, bg, 4.5)).toBeNull();
  });

  it("lightens fg on dark backgrounds", () => {
    const fg = { h: 215, s: 20, l: 45 }; // mid tone
    const bg = { h: 222, s: 47, l: 6 }; // dark bg
    const adjusted = adjustForContrast(fg, bg, 4.5);
    expect(adjusted).not.toBeNull();
    expect(adjusted!.l).toBeGreaterThan(fg.l);
    expect(contrastRatio(adjusted!, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

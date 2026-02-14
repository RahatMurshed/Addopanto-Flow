import { describe, it, expect } from "vitest";
import { getCurrencySymbol, formatCurrency, formatCurrencyPrecise, convertAmount, getCurrencyInfo, SUPPORTED_CURRENCIES } from "../currencyUtils";

describe("getCurrencySymbol", () => {
  it("returns ৳ for BDT", () => {
    expect(getCurrencySymbol("BDT")).toBe("৳");
  });

  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns ₹ for INR", () => {
    expect(getCurrencySymbol("INR")).toBe("₹");
  });

  it("returns code itself for unknown currency", () => {
    expect(getCurrencySymbol("XYZ")).toBe("XYZ");
  });
});

describe("getCurrencyInfo", () => {
  it("returns full info for known currency", () => {
    const info = getCurrencyInfo("USD");
    expect(info.code).toBe("USD");
    expect(info.symbol).toBe("$");
    expect(info.name).toBe("US Dollar");
    expect(info.decimals).toBe(2);
  });

  it("returns 0 decimals for JPY", () => {
    expect(getCurrencyInfo("JPY").decimals).toBe(0);
  });

  it("returns fallback for unknown currency", () => {
    const info = getCurrencyInfo("XYZ");
    expect(info.symbol).toBe("XYZ");
    expect(info.decimals).toBe(2);
  });
});

describe("SUPPORTED_CURRENCIES", () => {
  it("contains at least 10 currencies", () => {
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("formatCurrency", () => {
  it("formats basic amount with default BDT", () => {
    expect(formatCurrency(1000)).toBe("৳1,000");
  });

  it("formats with USD symbol", () => {
    expect(formatCurrency(1500, "USD")).toBe("$1,500");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("৳0");
  });

  it("formats negative amount", () => {
    const result = formatCurrency(-500, "BDT");
    expect(result).toContain("৳");
    expect(result).toContain("500");
  });

  it("formats with decimal places", () => {
    const result = formatCurrency(99.99, "USD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(result).toBe("$99.99");
  });

  // Compact mode
  it("compact: formats millions", () => {
    expect(formatCurrency(2500000, "BDT", { compact: true })).toBe("৳2.5M");
  });

  it("compact: formats thousands", () => {
    expect(formatCurrency(5000, "USD", { compact: true })).toBe("$5K");
  });

  it("compact: formats small amounts without suffix", () => {
    expect(formatCurrency(500, "BDT", { compact: true })).toBe("৳500");
  });

  it("compact: formats exactly 1000", () => {
    expect(formatCurrency(1000, "BDT", { compact: true })).toBe("৳1K");
  });

  it("compact: formats exactly 1000000", () => {
    expect(formatCurrency(1000000, "BDT", { compact: true })).toBe("৳1.0M");
  });
});

describe("formatCurrencyPrecise", () => {
  it("formats with 2 decimal places", () => {
    expect(formatCurrencyPrecise(100, "USD")).toBe("$100.00");
  });

  it("formats fractional amounts precisely", () => {
    expect(formatCurrencyPrecise(99.5, "BDT")).toBe("৳99.50");
  });

  it("formats zero precisely", () => {
    expect(formatCurrencyPrecise(0, "EUR")).toBe("€0.00");
  });

  it("formats JPY without decimals", () => {
    expect(formatCurrencyPrecise(1000, "JPY")).toBe("¥1,000");
  });
});

describe("convertAmount", () => {
  it("converts with exchange rate", () => {
    expect(convertAmount(100, 1.5)).toBe(150);
  });

  it("returns original amount for rate of 1", () => {
    expect(convertAmount(100, 1)).toBe(100);
  });

  it("returns original amount for invalid rate", () => {
    expect(convertAmount(100, 0)).toBe(100);
    expect(convertAmount(100, -1)).toBe(100);
  });

  it("handles decimal precision", () => {
    // 100 * 0.83 = 83.00
    expect(convertAmount(100, 0.83)).toBe(83);
  });

  it("rounds to 2 decimal places", () => {
    // 100 * 1.333 = 133.30
    expect(convertAmount(100, 1.333)).toBe(133.3);
  });
});

import { describe, it, expect } from "vitest";
import { getCurrencySymbol, formatCurrency, formatCurrencyPrecise } from "../currencyUtils";

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

  it("returns code itself for unknown currency", () => {
    expect(getCurrencySymbol("JPY")).toBe("JPY");
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
});

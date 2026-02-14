import { describe, it, expect } from "vitest";
import {
  getFiscalYearRange,
  getFiscalHalfRange,
  getDateRange,
  getYearOptions,
  getMonthOptions,
  getDefaultFilterValue,
  calculatePercentChange,
} from "../dateRangeUtils";

describe("getFiscalYearRange", () => {
  it("returns calendar year when fiscal starts in January", () => {
    const range = getFiscalYearRange(1, 2025);
    expect(range.start).toBe("2025-01-01");
    expect(range.end).toBe("2025-12-31");
    expect(range.label).toBe("FY 2025");
  });

  it("returns cross-year range when fiscal starts mid-year", () => {
    const range = getFiscalYearRange(7, 2024);
    expect(range.start).toBe("2024-07-01");
    expect(range.end).toBe("2025-06-30");
    expect(range.label).toBe("FY 2024-25");
  });

  it("handles April fiscal year start", () => {
    const range = getFiscalYearRange(4, 2025);
    expect(range.start).toBe("2025-04-01");
    expect(range.end).toBe("2026-03-31");
  });
});

describe("getFiscalHalfRange", () => {
  it("returns H1 for calendar year fiscal", () => {
    const range = getFiscalHalfRange(1, "H1", 2025);
    expect(range.start).toBe("2025-01-01");
    expect(range.end).toBe("2025-06-30");
    expect(range.label).toContain("H1");
  });

  it("returns H2 for calendar year fiscal", () => {
    const range = getFiscalHalfRange(1, "H2", 2025);
    expect(range.start).toBe("2025-07-01");
    expect(range.end).toBe("2025-12-31");
    expect(range.label).toContain("H2");
  });

  it("returns H1 for July fiscal year", () => {
    const range = getFiscalHalfRange(7, "H1", 2024);
    expect(range.start).toBe("2024-07-01");
    expect(range.end).toBe("2024-12-31");
  });

  it("returns H2 for July fiscal year (crosses into next year)", () => {
    const range = getFiscalHalfRange(7, "H2", 2024);
    expect(range.start).toBe("2025-01-01");
    expect(range.end).toBe("2025-06-30");
  });
});

describe("getDateRange", () => {
  it("daily: returns single day range", () => {
    const date = new Date(2025, 5, 15); // June 15, 2025
    const range = getDateRange("daily", { date });
    expect(range.start).toBe("2025-06-15");
    expect(range.end).toBe("2025-06-15");
  });

  it("monthly: returns full month range", () => {
    const range = getDateRange("monthly", { month: 0, year: 2025 }); // January
    expect(range.start).toBe("2025-01-01");
    expect(range.end).toBe("2025-01-31");
    expect(range.label).toBe("January 2025");
  });

  it("yearly: uses fiscal start month", () => {
    const range = getDateRange("yearly", { year: 2025 }, 7);
    expect(range.start).toBe("2025-07-01");
    expect(range.end).toBe("2026-06-30");
  });

  it("custom: returns exact date range", () => {
    const startDate = new Date(2025, 0, 1);
    const endDate = new Date(2025, 2, 31);
    const range = getDateRange("custom", { startDate, endDate });
    expect(range.start).toBe("2025-01-01");
    expect(range.end).toBe("2025-03-31");
  });
});

describe("getYearOptions", () => {
  it("returns 6 year options", () => {
    const options = getYearOptions();
    expect(options).toHaveLength(6);
  });

  it("includes current year first", () => {
    const options = getYearOptions();
    expect(options[0]).toBe(new Date().getFullYear());
  });

  it("years are in descending order", () => {
    const options = getYearOptions();
    for (let i = 1; i < options.length; i++) {
      expect(options[i]).toBeLessThan(options[i - 1]);
    }
  });
});

describe("getMonthOptions", () => {
  it("returns 12 months", () => {
    const options = getMonthOptions();
    expect(options).toHaveLength(12);
  });

  it("first month is January with value 0", () => {
    const options = getMonthOptions();
    expect(options[0].value).toBe(0);
    expect(options[0].label).toBe("January");
  });

  it("last month is December with value 11", () => {
    const options = getMonthOptions();
    expect(options[11].value).toBe(11);
    expect(options[11].label).toBe("December");
  });
});

describe("getDefaultFilterValue", () => {
  it("daily: returns date", () => {
    const value = getDefaultFilterValue("daily");
    expect(value.date).toBeInstanceOf(Date);
  });

  it("monthly: returns month and year", () => {
    const value = getDefaultFilterValue("monthly");
    expect(value.month).toBeDefined();
    expect(value.year).toBeDefined();
  });

  it("half-yearly: returns half and year", () => {
    const value = getDefaultFilterValue("half-yearly");
    expect(value.half).toMatch(/^H[12]$/);
    expect(value.year).toBeDefined();
  });

  it("yearly: returns year", () => {
    const value = getDefaultFilterValue("yearly");
    expect(value.year).toBeDefined();
  });

  it("custom: returns start and end dates", () => {
    const value = getDefaultFilterValue("custom");
    expect(value.startDate).toBeInstanceOf(Date);
    expect(value.endDate).toBeInstanceOf(Date);
  });
});

describe("calculatePercentChange", () => {
  it("returns positive change", () => {
    expect(calculatePercentChange(150, 100)).toBe(50);
  });

  it("returns negative change", () => {
    expect(calculatePercentChange(50, 100)).toBe(-50);
  });

  it("returns 0 for no change", () => {
    expect(calculatePercentChange(100, 100)).toBe(0);
  });

  it("returns 100 when previous is 0 and current is positive", () => {
    expect(calculatePercentChange(50, 0)).toBe(100);
  });

  it("returns null when both are 0", () => {
    expect(calculatePercentChange(0, 0)).toBeNull();
  });

  it("handles large percentages", () => {
    expect(calculatePercentChange(1000, 1)).toBe(99900);
  });
});

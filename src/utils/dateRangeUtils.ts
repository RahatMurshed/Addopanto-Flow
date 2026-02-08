import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  getYear,
  getMonth,
  addMonths,
  subMonths,
} from "date-fns";

export type FilterType = "daily" | "monthly" | "half-yearly" | "yearly" | "custom";

export interface FilterValue {
  date?: Date;
  month?: number;
  year?: number;
  half?: "H1" | "H2";
  startDate?: Date;
  endDate?: Date;
}

export interface DateRange {
  start: string; // ISO date string (YYYY-MM-DD)
  end: string; // ISO date string (YYYY-MM-DD)
  label: string;
}

/**
 * Get the fiscal year range based on fiscal year start month
 * @param fiscalStartMonth - 1-indexed month (1 = January, 7 = July)
 * @param year - The calendar year to base the fiscal year on
 */
export function getFiscalYearRange(fiscalStartMonth: number, year: number): DateRange {
  // If fiscal year starts in January, it's the same as calendar year
  if (fiscalStartMonth === 1) {
    const yearDate = new Date(year, 0, 1);
    return {
      start: format(startOfYear(yearDate), "yyyy-MM-dd"),
      end: format(endOfYear(yearDate), "yyyy-MM-dd"),
      label: `FY ${year}`,
    };
  }

  // Fiscal year spans two calendar years (e.g., July 2024 - June 2025)
  const fiscalYearStart = new Date(year, fiscalStartMonth - 1, 1);
  const fiscalYearEnd = endOfMonth(new Date(year + 1, fiscalStartMonth - 2, 1));

  return {
    start: format(fiscalYearStart, "yyyy-MM-dd"),
    end: format(fiscalYearEnd, "yyyy-MM-dd"),
    label: `FY ${year}-${(year + 1).toString().slice(-2)}`,
  };
}

/**
 * Get the fiscal half-year range
 * @param fiscalStartMonth - 1-indexed month (1 = January, 7 = July)
 * @param half - H1 or H2
 * @param year - The calendar year to base the fiscal year on
 */
export function getFiscalHalfRange(fiscalStartMonth: number, half: "H1" | "H2", year: number): DateRange {
  const h1StartMonth = fiscalStartMonth - 1; // Convert to 0-indexed
  const h2StartMonth = (h1StartMonth + 6) % 12;

  if (half === "H1") {
    const startDate = new Date(year, h1StartMonth, 1);
    const endDate = endOfMonth(addMonths(startDate, 5));
    
    // Calculate the end year for label
    const endYear = getYear(endDate);
    const startMonthName = format(startDate, "MMM");
    const endMonthName = format(endDate, "MMM");
    
    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
      label: fiscalStartMonth === 1 
        ? `H1 ${year} (${startMonthName} - ${endMonthName})`
        : `H1 FY ${year}-${(year + 1).toString().slice(-2)} (${startMonthName} - ${endMonthName})`,
    };
  } else {
    // H2 starts 6 months after H1 start
    const startYear = h2StartMonth < h1StartMonth ? year + 1 : year;
    const startDate = new Date(startYear, h2StartMonth, 1);
    const endDate = endOfMonth(addMonths(startDate, 5));
    
    const startMonthName = format(startDate, "MMM");
    const endMonthName = format(endDate, "MMM");
    
    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
      label: fiscalStartMonth === 1 
        ? `H2 ${year} (${startMonthName} - ${endMonthName})`
        : `H2 FY ${year}-${(year + 1).toString().slice(-2)} (${startMonthName} - ${endMonthName})`,
    };
  }
}

export function getDateRange(filterType: FilterType, filterValue: FilterValue, fiscalStartMonth: number = 1): DateRange {
  const now = new Date();
  const year = filterValue.year ?? getYear(now);

  switch (filterType) {
    case "daily": {
      const date = filterValue.date ?? now;
      return {
        start: format(startOfDay(date), "yyyy-MM-dd"),
        end: format(endOfDay(date), "yyyy-MM-dd"),
        label: format(date, "MMMM d, yyyy"),
      };
    }

    case "monthly": {
      const month = filterValue.month ?? getMonth(now);
      const monthDate = new Date(year, month, 1);
      return {
        start: format(startOfMonth(monthDate), "yyyy-MM-dd"),
        end: format(endOfMonth(monthDate), "yyyy-MM-dd"),
        label: format(monthDate, "MMMM yyyy"),
      };
    }

    case "half-yearly": {
      const half = filterValue.half ?? "H1";
      return getFiscalHalfRange(fiscalStartMonth, half, year);
    }

    case "yearly": {
      return getFiscalYearRange(fiscalStartMonth, year);
    }

    case "custom": {
      const startDate = filterValue.startDate ?? now;
      const endDate = filterValue.endDate ?? now;
      return {
        start: format(startOfDay(startDate), "yyyy-MM-dd"),
        end: format(endOfDay(endDate), "yyyy-MM-dd"),
        label: `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`,
      };
    }

    default:
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
        label: format(now, "MMMM yyyy"),
      };
  }
}

// Generate year options (current year and 5 years back)
export function getYearOptions(): number[] {
  const currentYear = getYear(new Date());
  return Array.from({ length: 6 }, (_, i) => currentYear - i);
}

// Generate month options
export function getMonthOptions(): { value: number; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), "MMMM"),
  }));
}

// Get default filter value for a filter type
export function getDefaultFilterValue(filterType: FilterType): FilterValue {
  const now = new Date();
  switch (filterType) {
    case "daily":
      return { date: now };
    case "monthly":
      return { month: getMonth(now), year: getYear(now) };
    case "half-yearly":
      return { half: getMonth(now) < 6 ? "H1" : "H2", year: getYear(now) };
    case "yearly":
      return { year: getYear(now) };
    case "custom":
      return { startDate: now, endDate: now };
    default:
      return { month: getMonth(now), year: getYear(now) };
  }
}

// Get the previous period's date range for comparison
export function getPreviousPeriodRange(filterType: FilterType, filterValue: FilterValue, fiscalStartMonth: number = 1): DateRange {
  const now = new Date();

  switch (filterType) {
    case "daily": {
      const date = filterValue.date ?? now;
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      return {
        start: format(startOfDay(prevDate), "yyyy-MM-dd"),
        end: format(endOfDay(prevDate), "yyyy-MM-dd"),
        label: format(prevDate, "MMMM d, yyyy"),
      };
    }

    case "monthly": {
      const month = filterValue.month ?? getMonth(now);
      const year = filterValue.year ?? getYear(now);
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const monthDate = new Date(prevYear, prevMonth, 1);
      return {
        start: format(startOfMonth(monthDate), "yyyy-MM-dd"),
        end: format(endOfMonth(monthDate), "yyyy-MM-dd"),
        label: format(monthDate, "MMMM yyyy"),
      };
    }

    case "half-yearly": {
      const half = filterValue.half ?? "H1";
      const year = filterValue.year ?? getYear(now);
      const prevHalf = half === "H1" ? "H2" : "H1";
      const prevYear = half === "H1" ? year - 1 : year;
      return getFiscalHalfRange(fiscalStartMonth, prevHalf, prevYear);
    }

    case "yearly": {
      const year = filterValue.year ?? getYear(now);
      const prevYear = year - 1;
      return getFiscalYearRange(fiscalStartMonth, prevYear);
    }

    case "custom": {
      const startDate = filterValue.startDate ?? now;
      const endDate = filterValue.endDate ?? now;
      const duration = endDate.getTime() - startDate.getTime();
      const prevEndDate = new Date(startDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - duration);
      return {
        start: format(startOfDay(prevStartDate), "yyyy-MM-dd"),
        end: format(endOfDay(prevEndDate), "yyyy-MM-dd"),
        label: `${format(prevStartDate, "MMM d")} - ${format(prevEndDate, "MMM d, yyyy")}`,
      };
    }

    default:
      return getPreviousPeriodRange("monthly", { month: getMonth(now), year: getYear(now) }, fiscalStartMonth);
  }
}

// Calculate percentage change between two values
export function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return ((current - previous) / previous) * 100;
}

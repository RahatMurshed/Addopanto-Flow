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

export function getDateRange(filterType: FilterType, filterValue: FilterValue): DateRange {
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
      const startMonth = half === "H1" ? 0 : 6;
      const endMonth = half === "H1" ? 5 : 11;
      const startDate = new Date(year, startMonth, 1);
      const endDate = endOfMonth(new Date(year, endMonth, 1));
      return {
        start: format(startDate, "yyyy-MM-dd"),
        end: format(endDate, "yyyy-MM-dd"),
        label: `${half} ${year} (${half === "H1" ? "Jan - Jun" : "Jul - Dec"})`,
      };
    }

    case "yearly": {
      const yearDate = new Date(year, 0, 1);
      return {
        start: format(startOfYear(yearDate), "yyyy-MM-dd"),
        end: format(endOfYear(yearDate), "yyyy-MM-dd"),
        label: `Year ${year}`,
      };
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

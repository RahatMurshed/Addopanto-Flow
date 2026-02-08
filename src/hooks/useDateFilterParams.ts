import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getMonth, getYear, parseISO, isValid } from "date-fns";
import {
  type FilterType,
  type FilterValue,
  getDefaultFilterValue,
} from "@/utils/dateRangeUtils";

const FILTER_TYPE_KEY = "filterType";
const DATE_KEY = "date";
const MONTH_KEY = "month";
const YEAR_KEY = "year";
const HALF_KEY = "half";
const START_DATE_KEY = "startDate";
const END_DATE_KEY = "endDate";

interface UseDateFilterParamsReturn {
  filterType: FilterType;
  filterValue: FilterValue;
  setFilterType: (type: FilterType) => void;
  updateFilterValue: (updates: Partial<FilterValue>) => void;
}

export function useDateFilterParams(
  defaultFilterType: FilterType = "monthly"
): UseDateFilterParamsReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filter type from URL or use default
  const getInitialFilterType = (): FilterType => {
    const param = searchParams.get(FILTER_TYPE_KEY);
    if (param && ["daily", "monthly", "half-yearly", "yearly", "custom"].includes(param)) {
      return param as FilterType;
    }
    return defaultFilterType;
  };

  // Parse filter value from URL based on filter type
  const getInitialFilterValue = (type: FilterType): FilterValue => {
    const defaults = getDefaultFilterValue(type);

    switch (type) {
      case "daily": {
        const dateParam = searchParams.get(DATE_KEY);
        if (dateParam) {
          const parsed = parseISO(dateParam);
          if (isValid(parsed)) {
            return { date: parsed };
          }
        }
        return defaults;
      }

      case "monthly": {
        const monthParam = searchParams.get(MONTH_KEY);
        const yearParam = searchParams.get(YEAR_KEY);
        return {
          month: monthParam !== null ? parseInt(monthParam, 10) : defaults.month,
          year: yearParam !== null ? parseInt(yearParam, 10) : defaults.year,
        };
      }

      case "half-yearly": {
        const halfParam = searchParams.get(HALF_KEY);
        const yearParam = searchParams.get(YEAR_KEY);
        return {
          half: halfParam === "H1" || halfParam === "H2" ? halfParam : defaults.half,
          year: yearParam !== null ? parseInt(yearParam, 10) : defaults.year,
        };
      }

      case "yearly": {
        const yearParam = searchParams.get(YEAR_KEY);
        return {
          year: yearParam !== null ? parseInt(yearParam, 10) : defaults.year,
        };
      }

      case "custom": {
        const startParam = searchParams.get(START_DATE_KEY);
        const endParam = searchParams.get(END_DATE_KEY);
        const startDate = startParam ? parseISO(startParam) : null;
        const endDate = endParam ? parseISO(endParam) : null;
        return {
          startDate: startDate && isValid(startDate) ? startDate : defaults.startDate,
          endDate: endDate && isValid(endDate) ? endDate : defaults.endDate,
        };
      }

      default:
        return defaults;
    }
  };

  const [filterType, setFilterTypeState] = useState<FilterType>(getInitialFilterType);
  const [filterValue, setFilterValue] = useState<FilterValue>(() =>
    getInitialFilterValue(getInitialFilterType())
  );

  // Sync to URL when filter changes
  const syncToUrl = useCallback(
    (type: FilterType, value: FilterValue) => {
      const params = new URLSearchParams(searchParams);

      // Clear old filter params
      [DATE_KEY, MONTH_KEY, YEAR_KEY, HALF_KEY, START_DATE_KEY, END_DATE_KEY].forEach((key) =>
        params.delete(key)
      );

      // Set filter type
      params.set(FILTER_TYPE_KEY, type);

      // Set type-specific params
      switch (type) {
        case "daily":
          if (value.date) {
            params.set(DATE_KEY, value.date.toISOString().split("T")[0]);
          }
          break;

        case "monthly":
          if (value.month !== undefined) params.set(MONTH_KEY, value.month.toString());
          if (value.year !== undefined) params.set(YEAR_KEY, value.year.toString());
          break;

        case "half-yearly":
          if (value.half) params.set(HALF_KEY, value.half);
          if (value.year !== undefined) params.set(YEAR_KEY, value.year.toString());
          break;

        case "yearly":
          if (value.year !== undefined) params.set(YEAR_KEY, value.year.toString());
          break;

        case "custom":
          if (value.startDate) {
            params.set(START_DATE_KEY, value.startDate.toISOString().split("T")[0]);
          }
          if (value.endDate) {
            params.set(END_DATE_KEY, value.endDate.toISOString().split("T")[0]);
          }
          break;
      }

      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Set filter type and reset value to defaults for new type
  const setFilterType = useCallback(
    (newType: FilterType) => {
      const newValue = getDefaultFilterValue(newType);
      setFilterTypeState(newType);
      setFilterValue(newValue);
      syncToUrl(newType, newValue);
    },
    [syncToUrl]
  );

  // Update filter value (partial update)
  const updateFilterValue = useCallback(
    (updates: Partial<FilterValue>) => {
      setFilterValue((prev) => {
        const updated = { ...prev, ...updates };
        syncToUrl(filterType, updated);
        return updated;
      });
    },
    [filterType, syncToUrl]
  );

  return {
    filterType,
    filterValue,
    setFilterType,
    updateFilterValue,
  };
}

import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type BatchFilterMode = "monthly" | "custom" | "alltime";

export type BatchFilterValue = {
  mode: BatchFilterMode;
  selectedMonth: string; // "YYYY-MM"
  startDate?: Date;
  endDate?: Date;
};

export function getDefaultBatchFilter(): BatchFilterValue {
  const now = new Date();
  return {
    mode: "monthly",
    selectedMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  };
}

/** Returns which months from allMonths match the filter */
export function getIncludedMonths(allMonths: string[], filter: BatchFilterValue): string[] {
  switch (filter.mode) {
    case "monthly":
      return allMonths.includes(filter.selectedMonth) ? [filter.selectedMonth] : [];
    case "custom": {
      if (!filter.startDate || !filter.endDate) return [];
      const startYM = `${filter.startDate.getFullYear()}-${String(filter.startDate.getMonth() + 1).padStart(2, "0")}`;
      const endYM = `${filter.endDate.getFullYear()}-${String(filter.endDate.getMonth() + 1).padStart(2, "0")}`;
      return allMonths.filter((m) => m >= startYM && m <= endYM);
    }
    case "alltime":
      return [...allMonths];
  }
}

/** Check if a single month matches the filter */
export function isMonthIncluded(month: string, filter: BatchFilterValue): boolean {
  switch (filter.mode) {
    case "monthly":
      return month === filter.selectedMonth;
    case "custom": {
      if (!filter.startDate || !filter.endDate) return false;
      const startYM = `${filter.startDate.getFullYear()}-${String(filter.startDate.getMonth() + 1).padStart(2, "0")}`;
      const endYM = `${filter.endDate.getFullYear()}-${String(filter.endDate.getMonth() + 1).padStart(2, "0")}`;
      return month >= startYM && month <= endYM;
    }
    case "alltime":
      return true;
  }
}

export function getFilterLabel(prefix: string, filter: BatchFilterValue): string {
  switch (filter.mode) {
    case "monthly": return `Monthly ${prefix}`;
    case "custom": return `Range ${prefix}`;
    case "alltime": return `Total ${prefix}`;
  }
}

interface BatchDateFilterProps {
  value: BatchFilterValue;
  onChange: (value: BatchFilterValue) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export default function BatchDateFilter({ value, onChange, minYear = 2020, maxYear = 2030, className }: BatchDateFilterProps) {
  const parsed = parse(value.selectedMonth, "yyyy-MM", new Date());
  const selectedYear = parsed.getFullYear();
  const selectedMonthIdx = parsed.getMonth();
  const [viewYear, setViewYear] = useState(selectedYear);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthLabel = format(parsed, "MMMM yyyy");

  const handleMonthSelect = (monthIdx: number) => {
    const m = `${viewYear}-${String(monthIdx + 1).padStart(2, "0")}`;
    onChange({ ...value, selectedMonth: m });
    setMonthPickerOpen(false);
  };

  const isFuture = (monthIdx: number) => {
    return viewYear > currentYear || (viewYear === currentYear && monthIdx > currentMonth);
  };

  const handleModeChange = (mode: BatchFilterMode) => {
    onChange({ ...value, mode });
  };

  const filterDisplayLabel = () => {
    switch (value.mode) {
      case "monthly":
        return monthLabel;
      case "custom":
        if (value.startDate && value.endDate) {
          return `${format(value.startDate, "MMM d, yyyy")} – ${format(value.endDate, "MMM d, yyyy")}`;
        }
        return "Select range";
      case "alltime":
        return "All Time";
    }
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Mode selector */}
      <Select value={value.mode} onValueChange={(v) => handleModeChange(v as BatchFilterMode)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
          <SelectItem value="alltime">All Time</SelectItem>
        </SelectContent>
      </Select>

      {/* Monthly mode: MonthYearPicker inline */}
      {value.mode === "monthly" && (
        <Popover open={monthPickerOpen} onOpenChange={(o) => { setMonthPickerOpen(o); if (o) setViewYear(selectedYear); }}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              {monthLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-3 pointer-events-auto" align="start">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={viewYear <= minYear} onClick={() => setViewYear((y) => y - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">{viewYear}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={viewYear >= maxYear} onClick={() => setViewYear((y) => y + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTH_LABELS.map((ml, idx) => {
                const selected = viewYear === selectedYear && idx === selectedMonthIdx;
                const disabled = isFuture(idx);
                return (
                  <Button
                    key={ml}
                    variant={selected ? "default" : "ghost"}
                    size="sm"
                    disabled={disabled}
                    className={cn("h-8 text-xs", selected && "pointer-events-none")}
                    onClick={() => handleMonthSelect(idx)}
                  >
                    {ml}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Custom range mode: two date pickers */}
      {value.mode === "custom" && (
        <div className="flex items-center gap-2">
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !value.startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.startDate ? format(value.startDate, "MMM d, yyyy") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.startDate}
                onSelect={(d) => {
                  onChange({ ...value, startDate: d || undefined });
                  setStartOpen(false);
                }}
                disabled={(d) => d > now}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">to</span>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !value.endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.endDate ? format(value.endDate, "MMM d, yyyy") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.endDate}
                onSelect={(d) => {
                  onChange({ ...value, endDate: d || undefined });
                  setEndOpen(false);
                }}
                disabled={(d) => d > now || (value.startDate ? d < value.startDate : false)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* All time mode: just a label */}
      {value.mode === "alltime" && (
        <span className="text-sm font-medium text-muted-foreground px-2">Showing all data</span>
      )}
    </div>
  );
}

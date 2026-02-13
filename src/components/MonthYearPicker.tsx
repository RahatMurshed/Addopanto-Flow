import { useState } from "react";
import { format, parse } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthYearPickerProps {
  value: string; // yyyy-MM
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export default function MonthYearPicker({ value, onChange, minYear = 2020, maxYear = 2030, className }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parse(value, "yyyy-MM", new Date());
  const selectedYear = parsed.getFullYear();
  const selectedMonthIdx = parsed.getMonth();

  const [viewYear, setViewYear] = useState(selectedYear);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const label = format(parsed, "MMMM yyyy");

  const handleSelect = (monthIdx: number) => {
    const m = `${viewYear}-${String(monthIdx + 1).padStart(2, "0")}`;
    onChange(m);
    setOpen(false);
  };

  const isFuture = (monthIdx: number) => {
    return viewYear > currentYear || (viewYear === currentYear && monthIdx > currentMonth);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setViewYear(selectedYear); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", className)}>
          <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3 pointer-events-auto" align="start">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={viewYear <= minYear}
            onClick={() => setViewYear(y => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={viewYear >= maxYear}
            onClick={() => setViewYear(y => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Month grid */}
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
                onClick={() => handleSelect(idx)}
              >
                {ml}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

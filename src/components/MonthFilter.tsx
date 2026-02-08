import { useMemo } from "react";
import { format, subMonths, getMonth, getYear } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

interface MonthFilterProps {
  value: string;
  onChange: (value: string) => void;
  monthsToShow?: number;
  showIcon?: boolean;
  className?: string;
}

export function useMonthFilter(initialMonthsBack = 0) {
  const now = new Date();
  const initialDate = subMonths(now, initialMonthsBack);
  const initialValue = `${getYear(initialDate)}-${getMonth(initialDate)}`;
  
  return {
    initialValue,
    parseMonth: (value: string) => {
      const [year, month] = value.split("-").map(Number);
      return { year, month };
    },
  };
}

export function getMonthDateRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month
  return {
    start: format(startDate, "yyyy-MM-dd"),
    end: format(endDate, "yyyy-MM-dd"),
    label: format(startDate, "MMMM yyyy"),
  };
}

export default function MonthFilter({
  value,
  onChange,
  monthsToShow = 12,
  showIcon = true,
  className,
}: MonthFilterProps) {
  const now = new Date();

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < monthsToShow; i++) {
      const date = subMonths(now, i);
      options.push({
        value: `${getYear(date)}-${getMonth(date)}`,
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  }, [monthsToShow]);

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          {showIcon && <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type FilterType,
  type FilterValue,
  type DateRange,
  getDateRange,
  getYearOptions,
  getMonthOptions,
  getDefaultFilterValue,
} from "@/utils/dateRangeUtils";
import { useDateFilterParams } from "@/hooks/useDateFilterParams";
import { useUserProfile } from "@/hooks/useUserProfile";

// Helper to get fiscal half labels based on fiscal start month
function getFiscalHalfLabels(fiscalStartMonth: number): { h1: string; h2: string } {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h1Start = fiscalStartMonth - 1; // Convert to 0-indexed
  const h1End = (h1Start + 5) % 12;
  const h2Start = (h1Start + 6) % 12;
  const h2End = (h2Start + 5) % 12;

  return {
    h1: `H1 (${months[h1Start]} - ${months[h1End]})`,
    h2: `H2 (${months[h2Start]} - ${months[h2End]})`,
  };
}

interface AdvancedDateFilterProps {
  onFilterChange: (range: DateRange, filterType: FilterType, filterValue: FilterValue) => void;
  defaultFilterType?: FilterType;
  className?: string;
}

export default function AdvancedDateFilter({
  onFilterChange,
  defaultFilterType = "monthly",
  className,
}: AdvancedDateFilterProps) {
  const { data: userProfile } = useUserProfile();
  const fiscalStartMonth = userProfile?.fiscal_year_start_month || 1;
  const fiscalHalfLabels = getFiscalHalfLabels(fiscalStartMonth);

  const {
    filterType,
    filterValue,
    setFilterType: handleFilterTypeChange,
    updateFilterValue,
    resetFilter,
  } = useDateFilterParams(defaultFilterType);

  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [dailyDateOpen, setDailyDateOpen] = useState(false);

  const yearOptions = getYearOptions();
  const monthOptions = getMonthOptions();

  // Call onFilterChange whenever filterType or filterValue changes
  useEffect(() => {
    const range = getDateRange(filterType, filterValue, fiscalStartMonth);
    onFilterChange(range, filterType, filterValue);
  }, [filterType, filterValue, fiscalStartMonth, onFilterChange]);

  const handleReset = () => {
    resetFilter();
  };

  // Check if current filter differs from default
  const defaultValue = getDefaultFilterValue(defaultFilterType);
  const isDefault = filterType === defaultFilterType && 
    JSON.stringify(filterValue) === JSON.stringify(defaultValue);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Filter Type Selector */}
      <Select value={filterType} onValueChange={(v) => handleFilterTypeChange(v as FilterType)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Filter type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="half-yearly">Half-Yearly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {/* Daily: Date Picker */}
      {filterType === "daily" && (
        <Popover open={dailyDateOpen} onOpenChange={setDailyDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !filterValue.date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterValue.date ? format(filterValue.date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filterValue.date}
              onSelect={(date) => {
                if (date) {
                  updateFilterValue({ date });
                  setDailyDateOpen(false);
                }
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Monthly: Month + Year */}
      {filterType === "monthly" && (
        <>
          <Select
            value={filterValue.month?.toString()}
            onValueChange={(v) => updateFilterValue({ month: parseInt(v) })}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterValue.year?.toString()}
            onValueChange={(v) => updateFilterValue({ year: parseInt(v) })}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Half-Yearly: H1/H2 + Year */}
      {filterType === "half-yearly" && (
        <>
          <Select
            value={filterValue.half}
            onValueChange={(v) => updateFilterValue({ half: v as "H1" | "H2" })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Half" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="H1">{fiscalHalfLabels.h1}</SelectItem>
              <SelectItem value="H2">{fiscalHalfLabels.h2}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterValue.year?.toString()}
            onValueChange={(v) => updateFilterValue({ year: parseInt(v) })}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Yearly: Year only */}
      {filterType === "yearly" && (
        <Select
          value={filterValue.year?.toString()}
          onValueChange={(v) => updateFilterValue({ year: parseInt(v) })}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Custom: Start and End Date */}
      {filterType === "custom" && (
        <>
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !filterValue.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterValue.startDate
                  ? format(filterValue.startDate, "MMM d, yyyy")
                  : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterValue.startDate}
                onSelect={(date) => {
                  if (date) {
                    updateFilterValue({ startDate: date });
                    setStartDateOpen(false);
                  }
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">to</span>
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !filterValue.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterValue.endDate
                  ? format(filterValue.endDate, "MMM d, yyyy")
                  : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterValue.endDate}
                onSelect={(date) => {
                  if (date) {
                    updateFilterValue({ endDate: date });
                    setEndDateOpen(false);
                  }
                }}
                disabled={(date) =>
                  filterValue.startDate ? date < filterValue.startDate : false
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Reset Filter Button */}
      {!isDefault && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </Button>
      )}
    </div>
  );
}

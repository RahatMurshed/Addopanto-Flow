import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarVariant = "default" | "bordered" | "filled";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Visual style variant – automatically theme-aware in light & dark modes.
   *  - `default`  – minimal, transparent background
   *  - `bordered` – subtle border with card background
   *  - `filled`   – muted/accent fill with softer day cells
   */
  variant?: CalendarVariant;
};

const variantWrapperClasses: Record<CalendarVariant, string> = {
  default: "",
  bordered: "rounded-lg border border-border bg-card shadow-sm",
  filled: "rounded-lg bg-muted/50 shadow-inner",
};

const variantDayClasses: Record<CalendarVariant, string> = {
  default: "",
  bordered: "hover:bg-accent/70",
  filled: "hover:bg-background/80",
};

const variantTodayClasses: Record<CalendarVariant, string> = {
  default: "bg-accent text-accent-foreground",
  bordered: "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30",
  filled: "bg-background text-foreground font-semibold shadow-sm",
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  variant = "default",
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-3 pointer-events-auto",
        variantWrapperClasses[variant],
        className,
      )}
      classNames={{
        months:
          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 opacity-70 hover:opacity-100 hover:bg-accent",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
          variantDayClasses[variant],
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: variantTodayClasses[variant],
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

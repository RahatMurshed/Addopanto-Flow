import { format } from "date-fns";
import { Check, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentSummary } from "@/hooks/useStudentPayments";

interface StudentMonthGridProps {
  summary: StudentSummary;
  className?: string;
}

export default function StudentMonthGrid({ summary, className }: StudentMonthGridProps) {
  const allMonths = [
    ...summary.monthlyPaidMonths,
    ...summary.monthlyOverdueMonths,
    ...summary.monthlyPendingMonths,
  ].sort();

  if (allMonths.length === 0) {
    return <p className="text-sm text-muted-foreground">No billing months yet.</p>;
  }

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1);
    return format(date, "MMM yy");
  };

  return (
    <div className={cn("grid grid-cols-4 sm:grid-cols-6 gap-2", className)}>
      {allMonths.map((m) => {
        const isPaid = summary.monthlyPaidMonths.includes(m);
        const isOverdue = summary.monthlyOverdueMonths.includes(m);
        return (
          <div
            key={m}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border p-2 text-xs font-medium",
              isPaid && "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
              isOverdue && "border-destructive/30 bg-destructive/10 text-destructive",
              !isPaid && !isOverdue && "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            )}
          >
            {isPaid && <Check className="h-3.5 w-3.5 mb-0.5" />}
            {isOverdue && <AlertTriangle className="h-3.5 w-3.5 mb-0.5" />}
            {!isPaid && !isOverdue && <Clock className="h-3.5 w-3.5 mb-0.5" />}
            <span>{formatMonth(m)}</span>
          </div>
        );
      })}
    </div>
  );
}

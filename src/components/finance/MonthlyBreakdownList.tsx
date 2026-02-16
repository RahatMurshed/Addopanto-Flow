import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import type { StudentPayment, StudentSummary, MonthlyFeeHistory } from "@/hooks/useStudentPayments";

interface MonthlyBreakdownListProps {
  summary: StudentSummary;
  payments: StudentPayment[];
  feeHistory: MonthlyFeeHistory[];
  monthlyFeeAmount: number;
  currency?: string; // kept for backward compat but useCompanyCurrency is used internally
}

function getFeeForMonth(month: string, monthlyFeeAmount: number, feeHistory: MonthlyFeeHistory[]): number {
  if (feeHistory.length === 0) return Number(monthlyFeeAmount);
  let fee = Number(monthlyFeeAmount);
  for (const h of feeHistory) {
    if (h.effective_from <= month) {
      fee = Number(h.monthly_amount);
    }
  }
  return fee;
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return format(new Date(Number(y), Number(mo) - 1), "MMM yyyy");
}

function findPaymentForMonth(month: string, payments: StudentPayment[]) {
  const monthlyPayments = payments.filter((p) => p.payment_type === "monthly");
  for (const p of monthlyPayments) {
    if (p.months_covered?.includes(month)) {
      return {
        date: p.payment_date,
        amount: Number(p.amount) / (p.months_covered?.length || 1),
        receipt: p.receipt_number,
      };
    }
  }
  return null;
}

export default function MonthlyBreakdownList({ summary, payments, feeHistory, monthlyFeeAmount }: MonthlyBreakdownListProps) {
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  const hasPaid = summary.monthlyPaidMonths.length > 0;
  const hasPartial = summary.monthlyPartialMonths.length > 0;
  const hasOverdue = summary.monthlyOverdueMonths.length > 0;
  const hasPending = summary.monthlyPendingMonths.length > 0;

  if (!hasPaid && !hasPartial && !hasOverdue && !hasPending) {
    return <p className="text-sm text-muted-foreground">No months to display yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Summary line */}
      <div className="flex flex-wrap gap-3 text-sm">
        {hasPaid && (
          <span className="text-primary font-medium">
            {summary.monthlyPaidMonths.length} paid ({formatCurrency(summary.monthlyPaidTotal, currency)})
          </span>
        )}
        {hasPartial && (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            {summary.monthlyPartialMonths.length} partial
          </span>
        )}
        {hasOverdue && (
          <span className="text-destructive font-medium">
            {summary.monthlyOverdueMonths.length} overdue ({formatCurrency(
              summary.monthlyOverdueMonths.reduce((s, m) => {
                const fee = getFeeForMonth(m, monthlyFeeAmount, feeHistory);
                const paid = summary.monthlyPaymentsByMonth.get(m) || 0;
                return s + (fee - paid);
              }, 0),
              currency
            )})
          </span>
        )}
        {hasPending && (
          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
            {summary.monthlyPendingMonths.length} pending
          </span>
        )}
      </div>

      {/* Overdue months */}
      {hasOverdue && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Overdue</p>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 divide-y divide-destructive/10">
            {summary.monthlyOverdueMonths.map((m) => {
              const fee = getFeeForMonth(m, monthlyFeeAmount, feeHistory);
              return (
                <div key={m} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-destructive">{formatMonth(m)}</span>
                  <span className="text-destructive font-semibold">{formatCurrency(fee, currency)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Partially Paid months */}
      {hasPartial && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Partially Paid</p>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 divide-y divide-amber-500/10">
            {summary.monthlyPartialMonths.map((m) => {
              const fee = getFeeForMonth(m, monthlyFeeAmount, feeHistory);
              const paid = summary.monthlyPaymentsByMonth.get(m) || 0;
              const remaining = fee - paid;
              return (
                <div key={m} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatMonth(m)}</span>
                    <span className="text-xs text-muted-foreground">
                      Paid {formatCurrency(paid, currency)}
                    </span>
                  </div>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    {formatCurrency(remaining, currency)} remaining
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paid months */}
      {hasPaid && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Paid</p>
          <div className="rounded-md border divide-y">
            {summary.monthlyPaidMonths.map((m) => {
              const info = findPaymentForMonth(m, payments);
              return (
                <div key={m} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatMonth(m)}</span>
                    {info && (
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(info.date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {info?.receipt && (
                      <Badge variant="outline" className="text-xs">{info.receipt}</Badge>
                    )}
                    <span className="text-primary font-semibold">
                      {formatCurrency(info?.amount || getFeeForMonth(m, monthlyFeeAmount, feeHistory), currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending months */}
      {hasPending && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Pending</p>
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 divide-y divide-yellow-500/10">
            {summary.monthlyPendingMonths.map((m) => {
              const fee = getFeeForMonth(m, monthlyFeeAmount, feeHistory);
              return (
                <div key={m} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{formatMonth(m)}</span>
                  <span className="text-yellow-700 dark:text-yellow-400 font-semibold">{formatCurrency(fee, currency)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

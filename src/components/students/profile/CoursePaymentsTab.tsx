import { useState, useMemo } from "react";
import { format, isBefore } from "date-fns";
import { ArrowUpDown, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/utils/exportCsv";

export interface CoursePaymentRow {
  id: string;
  amount: number;
  status: string;
  payment_date: string;
  payment_method: string;
  due_date: string;
  payment_type: string;
  user_id: string;
  courseName: string;
  batchName: string;
  batch_enrollment_id?: string | null;
}

interface CoursePaymentsTabProps {
  payments: CoursePaymentRow[];
  userMap: Map<string, string>;
  fc: (amount: number) => string;
  isAdmin: boolean;
  isLoading?: boolean;
}

type SortKey = "courseName" | "due_date" | "amount" | "status" | "payment_date" | "payment_method";
type SortDir = "asc" | "desc";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 10;

export function CoursePaymentsTab({ payments, userMap, fc, isAdmin, isLoading }: CoursePaymentsTabProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "due_date", dir: "desc" });
  const [page, setPage] = useState(1);

  // Split linked vs unlinked payments
  const { linkedPayments, unlinkedPayments } = useMemo(() => {
    const linked: CoursePaymentRow[] = [];
    const unlinked: CoursePaymentRow[] = [];
    for (const p of payments) {
      if (p.batch_enrollment_id === null || p.batch_enrollment_id === undefined) {
        // Only treat as unlinked if there are multiple enrollments (courseName will say "Unlinked")
        if (p.courseName === "Unlinked (pre-tracking)") {
          unlinked.push(p);
        } else {
          linked.push(p);
        }
      } else {
        linked.push(p);
      }
    }
    return { linkedPayments: linked, unlinkedPayments: unlinked };
  }, [payments]);

  const sorted = useMemo(() => {
    return [...linkedPayments].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "courseName": return dir * a.courseName.localeCompare(b.courseName);
        case "due_date": return dir * (new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        case "amount": return dir * (a.amount - b.amount);
        case "status": return dir * a.status.localeCompare(b.status);
        case "payment_date": return dir * (new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
        case "payment_method": return dir * a.payment_method.localeCompare(b.payment_method);
        default: return 0;
      }
    });
  }, [linkedPayments, sort]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const today = new Date();

  const toggleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const handleExport = () => {
    const headers = ["Course", "Batch", "Due Date", "Amount", "Status", "Payment Date", "Method", "Recorded By"];
    const rows = [...sorted, ...unlinkedPayments].map((p) => [
      p.courseName,
      p.batchName,
      format(new Date(p.due_date), "MMM d, yyyy"),
      String(p.amount),
      p.status,
      p.status !== "unpaid" ? format(new Date(p.payment_date), "MMM d, yyyy") : "",
      p.status !== "unpaid" ? p.payment_method : "",
      userMap.get(p.user_id) ?? "",
    ]);
    downloadCsv(`course-payments-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-muted-foreground">No course payments recorded yet</p>
      </div>
    );
  }

  function SortHeader({ label, sortKey }: { label: string; sortKey: SortKey }) {
    const isActive = sort.key === sortKey;
    return (
      <button
        onClick={() => toggleSort(sortKey)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", isActive && "text-primary")} />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExport} className="text-sm">
            <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      )}

      {/* Main linked payments table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left p-3"><SortHeader label="Course / Batch" sortKey="courseName" /></th>
              <th className="text-left p-3"><SortHeader label="Due Date" sortKey="due_date" /></th>
              <th className="text-right p-3"><SortHeader label="Amount" sortKey="amount" /></th>
              <th className="text-center p-3"><SortHeader label="Status" sortKey="status" /></th>
              <th className="text-left p-3"><SortHeader label="Payment Date" sortKey="payment_date" /></th>
              <th className="text-left p-3"><SortHeader label="Method" sortKey="payment_method" /></th>
              <th className="text-left p-3 hidden md:table-cell">
                <span className="text-xs font-medium text-muted-foreground">Recorded By</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((p) => {
              const isCancelled = p.status === "cancelled";
              const isOverdue = !isCancelled && p.status !== "paid" && isBefore(new Date(p.due_date), today);
              const rowBg = isCancelled
                ? "bg-muted/30"
                : p.status === "paid"
                  ? "bg-green-50/30 dark:bg-green-900/10"
                  : isOverdue
                    ? "bg-red-50/30 dark:bg-red-900/10"
                    : p.status === "partial"
                      ? "bg-yellow-50/30 dark:bg-yellow-900/10"
                      : "";

              return (
                <tr key={p.id} className={cn("border-b border-border last:border-0", rowBg)}>
                  <td className="p-3">
                    <div className={cn("font-medium text-foreground", isCancelled && "line-through text-muted-foreground")}>{p.courseName}</div>
                    <div className={cn("text-xs text-muted-foreground", isCancelled && "line-through")}>{p.batchName}</div>
                  </td>
                  <td className={cn("p-3 text-sm", isCancelled && "line-through text-muted-foreground", isOverdue && "text-red-600 dark:text-red-400 font-medium")}>
                    {format(new Date(p.due_date), "MMM d, yyyy")}
                  </td>
                  <td className={cn("p-3 text-right font-medium text-foreground", isCancelled && "line-through text-muted-foreground")}>{fc(p.amount)}</td>
                  <td className="p-3 text-center">
                    <Badge className={cn("text-xs rounded-full border-0 capitalize", STATUS_STYLES[p.status] ?? STATUS_STYLES.unpaid)}>
                      {isCancelled ? "Cancelled" : p.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {!isCancelled && p.status !== "unpaid" ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground capitalize">
                    {!isCancelled && p.status !== "unpaid" ? p.payment_method : "—"}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                    {userMap.get(p.user_id) ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination for linked payments */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Unlinked Payments Section */}
      {unlinkedPayments.length > 0 && (
        <div className="space-y-3 mt-6">
          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Unlinked Payments (pre-enrollment tracking)
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                The following {unlinkedPayments.length} payment{unlinkedPayments.length > 1 ? "s were" : " was"} recorded before the enrollment tracking system was introduced. They are preserved as historical records and have not been automatically assigned to any batch.
              </p>
            </div>
          </div>

          {/* Unlinked payments table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Due Date</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Payment Date</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Method</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {unlinkedPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 bg-yellow-50/30 dark:bg-yellow-900/5">
                    <td className="p-3 text-sm">{format(new Date(p.due_date), "MMM d, yyyy")}</td>
                    <td className="p-3 text-right font-medium text-foreground">{fc(p.amount)}</td>
                    <td className="p-3 text-center">
                      <Badge className={cn("text-xs rounded-full border-0 capitalize", STATUS_STYLES[p.status] ?? STATUS_STYLES.unpaid)}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {p.status !== "unpaid" ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground capitalize">
                      {p.status !== "unpaid" ? p.payment_method : "—"}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                      {userMap.get(p.user_id) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

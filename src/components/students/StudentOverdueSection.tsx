import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, lastDayOfMonth, parse } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Users, DollarSign, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { exportToPDF } from "@/utils/exportUtils";
import ExportButtons from "@/components/shared/ExportButtons";
import MonthYearPicker from "@/components/shared/MonthYearPicker";
import TablePagination from "@/components/shared/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import type { StudentSummary } from "@/hooks/useStudentPayments";

interface Student {
  id: string;
  name: string;
  student_id_number: string | null;
  monthly_fee_amount: number;
  billing_start_month: string;
  course_end_month: string | null;
  status: string;
}

interface OverdueRow {
  studentId: string;
  studentName: string;
  studentIdNumber: string | null;
  monthlyFee: number;
  amountPaid: number;
  amountRemaining: number;
  overdueMonth: string;
  overdueMonthLabel: string;
  daysOverdue: number;
  severity: "Low" | "Medium" | "High" | "Critical";
}

function getSeverity(days: number): OverdueRow["severity"] {
  if (days <= 30) return "Low";
  if (days <= 60) return "Medium";
  if (days <= 90) return "High";
  return "Critical";
}

const severityStyles: Record<OverdueRow["severity"], { badge: string; border: string }> = {
  Low: { badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30", border: "border-l-yellow-500" },
  Medium: { badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30", border: "border-l-orange-500" },
  High: { badge: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", border: "border-l-red-500" },
  Critical: { badge: "bg-red-900/20 text-red-900 dark:text-red-300 border-red-900/40", border: "border-l-red-900" },
};

function formatMonthLabel(month: string): string {
  const d = parse(month, "yyyy-MM", new Date());
  return format(d, "MMMM yyyy");
}

interface Props {
  students: Student[];
  studentSummaries: Map<string, StudentSummary>;
  currency?: string;
}

export default function StudentOverdueSection({ students, studentSummaries }: Props) {
  const { fc: formatCurrency } = useCompanyCurrency();
  const navigate = useNavigate();

  // Default to previous month
  const now = new Date();
  const prevMonth = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(prevMonth);
  const [filterMode, setFilterMode] = useState<"specific" | "all">("specific");
  const [severityFilter, setSeverityFilter] = useState<"all" | OverdueRow["severity"]>("all");

  // Build overdue rows
  const overdueRows = useMemo<OverdueRow[]>(() => {
    const rows: OverdueRow[] = [];
    const today = new Date();

    for (const s of students) {
      // Only active students should show overdue alerts
      if (s.status !== "active") continue;
      if (Number(s.monthly_fee_amount) === 0) continue;
      const sum = studentSummaries.get(s.id);
      if (!sum) continue;

      const allOverdue = [...sum.monthlyOverdueMonths, ...sum.monthlyPartialMonths];
      const monthsToCheck = filterMode === "all"
        ? allOverdue
        : allOverdue.filter(m => m === selectedMonth);

      for (const m of monthsToCheck) {
        const fee = Number(s.monthly_fee_amount);
        const paid = sum.monthlyPaymentsByMonth.get(m) || 0;
        const remaining = fee - paid;
        if (remaining <= 0) continue;

        const endOfMonth = lastDayOfMonth(parse(m, "yyyy-MM", new Date()));
        const days = differenceInDays(today, endOfMonth);

        rows.push({
          studentId: s.id,
          studentName: s.name,
          studentIdNumber: s.student_id_number,
          monthlyFee: fee,
          amountPaid: paid,
          amountRemaining: remaining,
          overdueMonth: m,
          overdueMonthLabel: formatMonthLabel(m),
          daysOverdue: Math.max(0, days),
          severity: getSeverity(Math.max(0, days)),
        });
      }
    }

    return rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [students, studentSummaries, selectedMonth, filterMode]);

  // Apply severity filter
  const filteredRows = useMemo(() => {
    if (severityFilter === "all") return overdueRows;
    return overdueRows.filter(r => r.severity === severityFilter);
  }, [overdueRows, severityFilter]);

  const {
    currentPage, totalPages, totalItems, paginatedItems,
    startIndex, endIndex, itemsPerPage, goToPage, setItemsPerPage,
    canGoNext, canGoPrev, resetPage,
  } = usePagination(filteredRows, { defaultItemsPerPage: 20 });

  // Reset page when filters change
  useEffect(() => { resetPage(); }, [severityFilter, filterMode, selectedMonth, resetPage]);

  // Summary metrics (from filtered rows)
  const totalOverdueStudents = new Set(filteredRows.map(r => r.studentId)).size;
  const totalOverdueAmount = filteredRows.reduce((s, r) => s + r.amountRemaining, 0);
  const avgDaysOverdue = filteredRows.length > 0
    ? Math.round(filteredRows.reduce((s, r) => s + r.daysOverdue, 0) / filteredRows.length)
    : 0;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Student Name", "Student ID", "Monthly Fee", "Amount Paid", "Amount Remaining", "Overdue Month", "Days Overdue", "Severity"];
    const csvRows = [
      headers.join(","),
      ...filteredRows.map(r => [
        `"${r.studentName}"`,
        `"${r.studentIdNumber || ""}"`,
        r.monthlyFee,
        r.amountPaid,
        r.amountRemaining,
        `"${r.overdueMonthLabel}"`,
        r.daysOverdue,
        `"${r.severity}"`,
      ].join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `overdue_report_${filterMode === "all" ? "all" : selectedMonth}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    const label = filterMode === "all" ? "All Overdue Months" : formatMonthLabel(selectedMonth);
    await exportToPDF("overdue-section", "overdue_report", "Monthly Overdue Report", label);
  };

  return (
    <Card id="overdue-section">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base">Monthly Overdue Report</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "specific" | "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="specific">Specific Month</SelectItem>
              <SelectItem value="all">All Overdue</SelectItem>
            </SelectContent>
          </Select>
          {filterMode === "specific" && (
            <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} minYear={2020} maxYear={2030} />
          )}
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <ExportButtons
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            disabled={filteredRows.length === 0}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-destructive/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Students</CardTitle>
              <Users className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{totalOverdueStudents}</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Overdue</CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdueAmount)}</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Days Overdue</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{avgDaysOverdue}</p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Table */}
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">
              {severityFilter !== "all"
                ? `No "${severityFilter}" severity overdue records found`
                : "No overdue students for the selected period"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              {severityFilter !== "all"
                ? "Try a different severity level or reset filters to see all overdue records."
                : filterMode === "specific"
                  ? 'Try switching to "All Months" or selecting a different month.'
                  : "All students are up to date — great job! 🎉"}
            </p>
            {(severityFilter !== "all" || filterMode === "specific") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSeverityFilter("all");
                  setFilterMode("all");
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Student ID</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Overdue Month</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((r) => (
                  <TableRow key={`${r.studentId}-${r.overdueMonth}`} className={`border-l-4 ${severityStyles[r.severity].border}`}>
                    <TableCell>
                      <button
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => navigate(`/students/${r.studentId}`)}
                      >
                        {r.studentName}
                      </button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{r.studentIdNumber || "—"}</TableCell>
                    <TableCell>{formatCurrency(r.monthlyFee)}</TableCell>
                    <TableCell>{formatCurrency(r.amountPaid)}</TableCell>
                    <TableCell className="font-semibold text-destructive">{formatCurrency(r.amountRemaining)}</TableCell>
                    <TableCell>{r.overdueMonthLabel}</TableCell>
                    <TableCell className="font-semibold">{r.daysOverdue}</TableCell>
                    <TableCell>
                      <Badge className={severityStyles[r.severity].badge}>{r.severity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsPerPage={itemsPerPage}
              onPageChange={goToPage}
              onItemsPerPageChange={setItemsPerPage}
              itemsPerPageOptions={[10, 20, 50]}
              canGoNext={canGoNext}
              canGoPrev={canGoPrev}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

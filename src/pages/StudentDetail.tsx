import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { useStudent, useUpdateStudent, type StudentInsert } from "@/hooks/useStudents";
import {
  useStudentPayments, useCreateStudentPayment, useUpdateStudentPayment, useDeleteStudentPayment,
  useMonthlyFeeHistory, computeStudentSummary,
} from "@/hooks/useStudentPayments";
import { useBatch, useBatches } from "@/hooks/useBatches";
import { useCourse } from "@/hooks/useCourses";
import { useStudentBatchHistory } from "@/hooks/useStudentBatchHistory";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Plus, Trash2, Loader2, GraduationCap, CalendarDays, TrendingUp, StickyNote, MessageSquare, ChevronDown, Layers, Info, Search, X, SlidersHorizontal, BookOpen, ArrowRight, Clock, History } from "lucide-react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import StudentDialog from "@/components/StudentDialog";
import StudentPaymentDialog from "@/components/StudentPaymentDialog";
import StudentMonthGrid from "@/components/StudentMonthGrid";
import MonthlyBreakdownList from "@/components/MonthlyBreakdownList";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddRevenue, canEdit, canDelete, isDataEntryOperator, canEditStudent, isLoading: companyLoading } = useCompany();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  const { data: student, isLoading: studentLoading } = useStudent(id);
  const { data: payments = [], isLoading: paymentsLoading } = useStudentPayments(id);
  const { data: feeHistory = [] } = useMonthlyFeeHistory(id);
  const batchId = (student as any)?.batch_id;
  const { data: batch } = useBatch(batchId);
  const courseId = (batch as any)?.course_id;
  const { data: course } = useCourse(courseId);
  const { data: batchHistory = [] } = useStudentBatchHistory(id);
  const { data: allBatches = [] } = useBatches();

  const updateMutation = useUpdateStudent();
  const createPaymentMutation = useCreateStudentPayment();
  const updatePaymentMutation = useUpdateStudentPayment();
  const deletePaymentMutation = useDeleteStudentPayment();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<typeof payments[0] | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  // Payment filter state
  const [paymentSearch, setPaymentSearch] = useState("");
  const [debouncedPaymentSearch, setDebouncedPaymentSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [paymentSort, setPaymentSort] = useState("date-desc");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPaymentSearch(paymentSearch), 300);
    return () => clearTimeout(timer);
  }, [paymentSearch]);

  // Redirect DEO without edit permission
  useEffect(() => {
    if (!companyLoading && isDataEntryOperator && !canEditStudent) {
      navigate("/students", { replace: true });
    }
  }, [companyLoading, isDataEntryOperator, canEditStudent, navigate]);

  const batchCourseStartMonth = useMemo(() => {
    if (!batch?.start_date) return "";
    const d = new Date(batch.start_date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [batch]);

  const batchCourseEndMonth = useMemo(() => {
    if (!batch?.start_date || !batch?.course_duration_months) return "";
    const d = new Date(batch.start_date);
    d.setMonth(d.getMonth() + batch.course_duration_months - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [batch]);

  const effectiveAdmissionFee = Number(student?.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
  const effectiveMonthlyFee = Number(student?.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;

  const summary = useMemo(() => {
    if (!student) return null;
    const effectiveStudent = {
      ...student,
      admission_fee_total: effectiveAdmissionFee,
      monthly_fee_amount: effectiveMonthlyFee,
      course_start_month: student.course_start_month || batchCourseStartMonth || null,
      course_end_month: student.course_end_month || batchCourseEndMonth || null,
    };
    return computeStudentSummary(effectiveStudent, payments, feeHistory);
  }, [student, payments, feeHistory, effectiveAdmissionFee, effectiveMonthlyFee, batchCourseStartMonth, batchCourseEndMonth]);

  // Filtered & sorted payments
  const filteredPayments = useMemo(() => {
    let result = [...payments];

    if (debouncedPaymentSearch) {
      const q = debouncedPaymentSearch.toLowerCase();
      result = result.filter((p) =>
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.receipt_number && p.receipt_number.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((p) => p.payment_type === typeFilter);
    }

    if (methodFilter !== "all") {
      result = result.filter((p) => p.payment_method === methodFilter);
    }

    result.sort((a, b) => {
      switch (paymentSort) {
        case "date-asc": return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
        case "date-desc": return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
        case "amount-desc": return Number(b.amount) - Number(a.amount);
        case "amount-asc": return Number(a.amount) - Number(b.amount);
        default: return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
      }
    });

    return result;
  }, [payments, debouncedPaymentSearch, typeFilter, methodFilter, paymentSort]);

  const paymentPagination = usePagination(filteredPayments);

  useEffect(() => {
    paymentPagination.resetPage();
  }, [debouncedPaymentSearch, typeFilter, methodFilter, paymentSort]);

  const paymentFilterCount = (debouncedPaymentSearch ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (methodFilter !== "all" ? 1 : 0) + (paymentSort !== "date-desc" ? 1 : 0);

  const resetPaymentFilters = () => {
    setPaymentSearch("");
    setTypeFilter("all");
    setMethodFilter("all");
    setPaymentSort("date-desc");
  };

  const handleUpdate = async (data: StudentInsert) => {
    if (!student) return;
    try {
      await updateMutation.mutateAsync({ id: student.id, ...data });
      toast({ title: "Student updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handlePayment = async (data: any) => {
    try {
      await createPaymentMutation.mutateAsync(data);
      toast({ title: "Payment recorded" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdatePayment = async (data: any) => {
    try {
      await updatePaymentMutation.mutateAsync(data);
      toast({ title: "Payment updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const openEditPayment = (payment: typeof payments[0]) => {
    setEditingPayment(payment);
    setPaymentDialogOpen(true);
  };

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    try {
      await deletePaymentMutation.mutateAsync(deletePaymentId);
      toast({ title: "Payment deleted" });
      setDeletePaymentId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (studentLoading || paymentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!student || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="link" onClick={() => navigate("/courses")}>Back to Courses</Button>
      </div>
    );
  }

  const admissionPercent = summary.admissionTotal > 0 ? Math.min(100, (summary.admissionPaid / summary.admissionTotal) * 100) : 0;
  const monthlyTotal = summary.totalExpected - summary.admissionTotal;
  const monthlyPercent = monthlyTotal > 0 ? Math.min(100, (summary.monthlyPaidTotal / monthlyTotal) * 100) : 0;

  const formatMethod = (m: string) => {
    const map: Record<string, string> = { cash: "Cash", card: "Card", bank_transfer: "Bank Transfer", mobile_banking: "Mobile Banking", other: "Other" };
    return map[m] || m;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/courses">Courses</Link></BreadcrumbLink>
          </BreadcrumbItem>
          {course && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to={`/courses/${courseId}`}>{course.course_name}</Link></BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          {batch && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to={`/batches/${batchId}`}>{batch.batch_name}</Link></BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{student.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => batchId ? navigate(`/batches/${batchId}`) : navigate("/courses")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
              <Badge variant={student.status === "active" ? "default" : "secondary"} className="capitalize">{student.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {student.student_id_number && `ID: ${student.student_id_number} · `}
              Enrolled {format(new Date(student.enrollment_date), "MMM d, yyyy")}
              {student.email && ` · ${student.email}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
          {canAddRevenue && (
            summary && summary.totalPending <= 0 ? (
              <Button disabled className="opacity-60"><Plus className="mr-2 h-4 w-4" />All Fees Collected</Button>
            ) : (
              <Button onClick={() => setPaymentDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Payment</Button>
            )
          )}
        </div>
      </div>

      {/* Batch Info */}
      {batch && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <Layers className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Button variant="link" className="h-auto p-0 text-sm font-semibold text-primary" onClick={() => navigate(`/batches/${batch.id}`)}>
                  {batch.batch_name}
                </Button>
                <Badge variant="outline" className="text-xs">{batch.batch_code}</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Admission: {formatCurrency(Number(batch.default_admission_fee), currency)}
                  <Badge variant="secondary" className="text-[10px] ml-1">From Batch Default</Badge>
                </span>
                <span className="flex items-center gap-1">
                  Monthly: {formatCurrency(Number(batch.default_monthly_fee), currency)}
                  <Badge variant="secondary" className="text-[10px] ml-1">From Batch Default</Badge>
                </span>
                {batch.course_duration_months && (
                  <span>Duration: {batch.course_duration_months} months</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Admission Fee */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Admission Fee</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.admissionTotal > 0 ? (
              <>
                <p className="text-2xl font-bold">{formatCurrency(summary.admissionTotal, currency)}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary.admissionPaid, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(summary.admissionPending, currency)}</span>
                </div>
                <Progress value={admissionPercent} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{admissionPercent.toFixed(0)}% complete</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No admission fee set</p>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Monthly Tuition */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">Monthly Tuition</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {effectiveMonthlyFee > 0 ? (
              <>
                <p className="text-2xl font-bold">{formatCurrency(monthlyTotal, currency)}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid ({summary.monthlyPaidMonths.length} mo)</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary.monthlyPaidTotal, currency)}</span>
                </div>
                {summary.monthlyPartialMonths.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Partial ({summary.monthlyPartialMonths.length} mo)</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(
                        summary.monthlyPartialMonths.reduce((s, m) => s + (summary.monthlyPaymentsByMonth.get(m) || 0), 0),
                        currency
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending ({summary.monthlyOverdueMonths.length + summary.monthlyPartialMonths.length + summary.monthlyPendingMonths.length} mo)</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(summary.monthlyPendingTotal, currency)}</span>
                </div>
                <Progress value={monthlyPercent} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{monthlyPercent.toFixed(0)}% complete</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No monthly fee set</p>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Overall Total */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-base">Overall Total</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold">{formatCurrency(summary.totalExpected, currency)}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary.totalPaid, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Pending</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(summary.totalPending, currency)}</span>
            </div>
            <Progress value={summary.overallPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{summary.overallPercent.toFixed(0)}% complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Notes Card */}
      {student.notes && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base">Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Batch Transfer History */}
      {batchHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
                <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-base">Batch Transfer History</CardTitle>
                <p className="text-xs text-muted-foreground">{batchHistory.length} transfer{batchHistory.length !== 1 ? "s" : ""} recorded</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {batchHistory.map((entry, idx) => {
                  const batchMap = new Map(allBatches.map(b => [b.id, b.batch_name]));
                  const fromName = entry.from_batch_id ? batchMap.get(entry.from_batch_id) || "Unknown Batch" : null;
                  const toName = entry.to_batch_id ? batchMap.get(entry.to_batch_id) || "Unknown Batch" : null;
                  const isFirst = idx === 0;
                  return (
                    <div key={entry.id} className="relative flex gap-3">
                      {/* Timeline dot */}
                      <div className={`absolute -left-6 top-1 h-[10px] w-[10px] rounded-full border-2 ${
                        isFirst ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          {fromName ? (
                            <>
                              <Badge variant="outline" className="text-xs">{fromName}</Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <Badge variant="secondary" className="text-xs">{toName || "Unassigned"}</Badge>
                            </>
                          ) : (
                            <>
                              <span className="text-muted-foreground text-xs">Assigned to</span>
                              <Badge variant="secondary" className="text-xs">{toName || "Unknown"}</Badge>
                            </>
                          )}
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.reason}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(entry.transferred_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Monthly Fee Visual Grid & Breakdown */}
      {effectiveMonthlyFee > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Fee Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(effectiveMonthlyFee, currency)}/month
              {(student.course_start_month || batchCourseStartMonth) && ` · From ${student.course_start_month || batchCourseStartMonth}`}
              {(student.course_end_month || batchCourseEndMonth) && ` to ${student.course_end_month || batchCourseEndMonth}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <StudentMonthGrid summary={summary} />

            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Payment Progress</span>
                <span className="font-semibold">{summary.overallPercent.toFixed(0)}%</span>
              </div>
              <Progress value={summary.overallPercent} className="h-3" />
            </div>

            <MonthlyBreakdownList
              summary={summary}
              payments={payments}
              feeHistory={feeHistory}
              monthlyFeeAmount={effectiveMonthlyFee}
              currency={currency}
            />
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Payment History</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredPayments.length !== payments.length
                ? `Showing ${filteredPayments.length} of ${payments.length}`
                : `${payments.length} payments`}
            </span>
          </div>
          {payments.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search description or receipt..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {paymentSearch && (
                  <button onClick={() => setPaymentSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="admission">Admission</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentSort} onValueChange={setPaymentSort}>
                <SelectTrigger className="w-[150px]">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date Newest</SelectItem>
                  <SelectItem value="date-asc">Date Oldest</SelectItem>
                  <SelectItem value="amount-desc">Amount High</SelectItem>
                  <SelectItem value="amount-asc">Amount Low</SelectItem>
                </SelectContent>
              </Select>
              {paymentFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetPaymentFilters} className="gap-1">
                  <X className="h-3 w-3" />
                  Reset
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">{paymentFilterCount}</Badge>
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payments recorded yet.</p>
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payments match your filters.</p>
              <Button variant="link" onClick={resetPaymentFilters}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Method</TableHead>
                      <TableHead className="hidden md:table-cell">Months</TableHead>
                      <TableHead className="hidden lg:table-cell">Receipt</TableHead>
                      {(canEdit || canDelete) && <TableHead className="w-24">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentPagination.paginatedItems.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatCurrency(Number(p.amount), currency)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`capitalize ${p.payment_type === "admission" ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"}`}
                          >
                            {p.payment_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{formatMethod(p.payment_method)}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {p.months_covered && p.months_covered.length > 0
                            ? p.months_covered.map((m) => { const [y, mo] = m.split("-"); return format(new Date(Number(y), Number(mo) - 1), "MMM yy"); }).join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{p.receipt_number || "—"}</TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell>
                            <div className="flex gap-1">
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPayment(p)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletePaymentId(p.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={paymentPagination.currentPage}
                totalPages={paymentPagination.totalPages}
                totalItems={paymentPagination.totalItems}
                startIndex={paymentPagination.startIndex}
                endIndex={paymentPagination.endIndex}
                itemsPerPage={paymentPagination.itemsPerPage}
                onPageChange={paymentPagination.goToPage}
                onItemsPerPageChange={paymentPagination.setItemsPerPage}
                canGoNext={paymentPagination.canGoNext}
                canGoPrev={paymentPagination.canGoPrev}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Notes Timeline */}
      {(() => {
        const notedPayments = payments
          .filter((p) => p.description)
          .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
        if (notedPayments.length === 0) return null;
        const visibleCount = 5;
        const firstBatch = notedPayments.slice(0, visibleCount);
        const restBatch = notedPayments.slice(visibleCount);

        const renderNote = (p: typeof notedPayments[0]) => (
          <div key={p.id} className="flex gap-3 py-3 border-b last:border-b-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{format(new Date(p.payment_date), "MMM d, yyyy")}</span>
                <Badge
                  variant="secondary"
                  className={`capitalize text-xs ${p.payment_type === "admission" ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"}`}
                >
                  {p.payment_type}
                </Badge>
                <span className="text-muted-foreground">{formatCurrency(Number(p.amount), currency)}</span>
                <span className="ml-auto flex gap-1">
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPayment(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletePaymentId(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-all">{p.description}</p>
            </div>
          </div>
        );

        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-base">Payment Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {firstBatch.map(renderNote)}
              {restBatch.length > 0 && (
                <Collapsible>
                  <CollapsibleContent>
                    {restBatch.map(renderNote)}
                  </CollapsibleContent>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
                      <ChevronDown className="mr-1 h-4 w-4" />
                      Show {restBatch.length} more note{restBatch.length > 1 ? "s" : ""}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })()}


      <StudentDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} student={student} onSave={handleUpdate} />

      {/* Payment Dialog */}
      <StudentPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setEditingPayment(null); }}
        student={student}
        summary={summary}
        onSave={handlePayment}
        editingPayment={editingPayment}
        onUpdate={handleUpdatePayment}
        batchDefaultAdmissionFee={Number(batch?.default_admission_fee) || 0}
        batchDefaultMonthlyFee={Number(batch?.default_monthly_fee) || 0}
        courseName={course?.course_name}
        batchName={batch?.batch_name}
      />

      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => { if (!open && !deletePaymentMutation.isPending) setDeletePaymentId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deletePaymentMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this payment record. The corresponding revenue entry will remain for audit purposes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePaymentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeletePayment(); }} disabled={deletePaymentMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePaymentMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

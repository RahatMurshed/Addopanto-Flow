import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parse } from "date-fns";
import MonthYearPicker from "@/components/MonthYearPicker";
import { useBatch, useUpdateBatch, type BatchInsert } from "@/hooks/useBatches";
import { useStudents } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useCompany } from "@/contexts/CompanyContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrency } from "@/utils/currencyUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Eye, CreditCard, Users, TrendingUp, CalendarDays, Layers, Plus, AlertTriangle, Search, X, Info, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import BatchDialog from "@/components/BatchDialog";
import StudentDialog from "@/components/StudentDialog";
import StudentPaymentDialog from "@/components/StudentPaymentDialog";
import { useCreateStudent, useUpdateStudent, useDeleteStudent, type StudentInsert } from "@/hooks/useStudents";
import { useCreateStudentPayment } from "@/hooks/useStudentPayments";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddRevenue, canEdit } = useCompany();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";

  const { data: batch, isLoading: batchLoading } = useBatch(id);
  const { data: allStudents = [], isLoading: studentsLoading } = useStudents();
  const { data: allPayments = [] } = useStudentPayments();

  const updateMutation = useUpdateBatch();
  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();
  const createPaymentMutation = useCreateStudentPayment();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editStudentDialogOpen, setEditStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedOverdueMonth, setSelectedOverdueMonth] = useState(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

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

  const batchTotalMonths = batch?.course_duration_months || 0;

  const batchStudents = useMemo(() => {
    if (!id) return [];
    let students = allStudents.filter((s: any) => s.batch_id === id);
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      students = students.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.student_id_number && s.student_id_number.toLowerCase().includes(q))
      );
    }
    return students;
  }, [allStudents, id, studentSearch]);

  const studentSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentSummary>>();
    for (const s of batchStudents) {
      const effectiveStudent = {
        ...s,
        admission_fee_total: Number(s.admission_fee_total) || Number(batch?.default_admission_fee) || 0,
        monthly_fee_amount: Number(s.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0,
        course_start_month: s.course_start_month || batchCourseStartMonth || null,
        course_end_month: s.course_end_month || batchCourseEndMonth || null,
      };
      const payments = allPayments.filter((p) => p.student_id === s.id);
      map.set(s.id, computeStudentSummary(effectiveStudent, payments));
    }
    return map;
  }, [batchStudents, allPayments, batch, batchCourseStartMonth, batchCourseEndMonth]);

  // All students in batch (unfiltered) for summary stats
  const allBatchStudents = useMemo(() => {
    if (!id) return [];
    return allStudents.filter((s: any) => s.batch_id === id);
  }, [allStudents, id]);

  const allSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentSummary>>();
    for (const s of allBatchStudents) {
      const effectiveStudent = {
        ...s,
        admission_fee_total: Number(s.admission_fee_total) || Number(batch?.default_admission_fee) || 0,
        monthly_fee_amount: Number(s.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0,
        course_start_month: s.course_start_month || batchCourseStartMonth || null,
        course_end_month: s.course_end_month || batchCourseEndMonth || null,
      };
      const payments = allPayments.filter((p) => p.student_id === s.id);
      map.set(s.id, computeStudentSummary(effectiveStudent, payments));
    }
    return map;
  }, [allBatchStudents, allPayments, batch, batchCourseStartMonth, batchCourseEndMonth]);

  const batchStats = useMemo(() => {
    let totalCollected = 0;
    let totalPending = 0;
    let admissionCollected = 0;
    let admissionPending = 0;
    let monthlyCollected = 0;
    let monthlyPending = 0;
    let overdueAmount = 0;
    let overdueStudentCount = 0;
    let admissionFullyPaidCount = 0;
    let totalMonthsDue = 0;
    let totalMonthsPaid = 0;

    const currentMonth = selectedMonth;
    let thisMonthDue = 0;
    let thisMonthCollected = 0;

    for (const [sid, sum] of allSummaries.entries()) {
      const student = allBatchStudents.find((s) => s.id === sid);
      if (!student) continue;

      const effAdm = Number(student.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
      const effMonthly = Number(student.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;

      totalCollected += sum.totalPaid;
      totalPending += sum.totalPending;
      admissionCollected += sum.admissionPaid;
      admissionPending += Math.max(0, effAdm - sum.admissionPaid);
      monthlyCollected += sum.monthlyPaidTotal;
      monthlyPending += sum.monthlyPendingTotal;

      if (sum.admissionStatus === "paid") admissionFullyPaidCount++;

      const allMonthsCount = sum.monthlyPaidMonths.length + sum.monthlyPartialMonths.length + sum.monthlyOverdueMonths.length + sum.monthlyPendingMonths.length;
      totalMonthsDue += allMonthsCount;
      totalMonthsPaid += sum.monthlyPaidMonths.length;

      if (sum.monthlyOverdueMonths.length > 0) {
        overdueStudentCount++;
        for (const m of sum.monthlyOverdueMonths) {
          overdueAmount += effMonthly - (sum.monthlyPaymentsByMonth.get(m) || 0);
        }
      }

      // This month stats
      const allMonths = [...sum.monthlyPaidMonths, ...sum.monthlyPartialMonths, ...sum.monthlyOverdueMonths, ...sum.monthlyPendingMonths];
      if (allMonths.includes(currentMonth)) {
        thisMonthDue += effMonthly;
        thisMonthCollected += sum.monthlyPaymentsByMonth.get(currentMonth) || 0;
      }
    }

    const studentCount = allBatchStudents.length;
    const admissionPercent = studentCount > 0 ? Math.round((admissionFullyPaidCount / studentCount) * 100) : 0;
    const monthlyPercent = totalMonthsDue > 0 ? Math.round((totalMonthsPaid / totalMonthsDue) * 100) : 0;
    const thisMonthPercent = thisMonthDue > 0 ? Math.round((thisMonthCollected / thisMonthDue) * 100) : 0;

    // Per-month overdue for selectedOverdueMonth
    let perMonthOverdueCount = 0;
    let perMonthOverdueAmount = 0;
    for (const [sid, sum] of allSummaries.entries()) {
      const student = allBatchStudents.find((s) => s.id === sid);
      if (!student) continue;
      const effMonthly = Number(student.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;
      if (sum.monthlyOverdueMonths.includes(selectedOverdueMonth) || sum.monthlyPartialMonths.includes(selectedOverdueMonth)) {
        perMonthOverdueCount++;
        perMonthOverdueAmount += effMonthly - (sum.monthlyPaymentsByMonth.get(selectedOverdueMonth) || 0);
      }
    }

    return {
      totalCollected, totalPending,
      admissionCollected, admissionPending,
      monthlyCollected, monthlyPending,
      overdueAmount, overdueStudentCount,
      admissionPercent, monthlyPercent,
      thisMonthDue, thisMonthCollected, thisMonthPercent,
      currentMonth,
      perMonthOverdueCount, perMonthOverdueAmount,
    };
  }, [allSummaries, allBatchStudents, batch, selectedMonth, selectedOverdueMonth]);

  const pagination = usePagination(batchStudents);

  useEffect(() => {
    pagination.goToPage(1);
  }, [studentSearch]);

  const handleUpdate = async (data: BatchInsert) => {
    if (!batch) return;
    try {
      await updateMutation.mutateAsync({ id: batch.id, ...data });
      toast({ title: "Batch updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleCreateStudent = async (data: StudentInsert) => {
    try {
      const result = await createStudentMutation.mutateAsync({ ...data, batch_id: id } as any);
      toast({ title: "Student added to batch" });
      return result;
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

  const handleUpdateStudent = async (data: StudentInsert) => {
    if (!editingStudent) return;
    try {
      await updateStudentMutation.mutateAsync({ id: editingStudent.id, ...data });
      toast({ title: "Student updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudentId) return;
    setDeleting(true);
    try {
      await deleteStudentMutation.mutateAsync(deleteStudentId);
      toast({ title: "Student deleted" });
      setDeleteStudentId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (batchLoading || studentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Batch not found</p>
        <Button variant="link" onClick={() => navigate("/batches")}>Back to Batches</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/batches")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{batch.batch_name}</h1>
              <Badge className={batch.status === "active" ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" : ""}>{batch.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {batch.batch_code} · Started {format(new Date(batch.start_date), "MMM d, yyyy")}
              {batch.end_date && ` · Ends ${format(new Date(batch.end_date), "MMM d, yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
          {canAddRevenue && <Button onClick={() => setStudentDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Student</Button>}
        </div>
      </div>

      {/* Batch Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {batch.description && (
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-sm text-muted-foreground">{batch.description}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Course Duration</p>
              <p className="text-sm font-semibold">{batch.course_duration_months ? `${batch.course_duration_months} months` : "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Default Admission Fee</p>
              <p className="text-sm font-semibold">{formatCurrency(Number(batch.default_admission_fee), currency)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Default Monthly Fee</p>
              <p className="text-sm font-semibold">{formatCurrency(Number(batch.default_monthly_fee), currency)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Capacity</p>
              <p className="text-sm font-semibold">{allBatchStudents.length}{batch.max_capacity ? ` / ${batch.max_capacity}` : ""} students</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Students */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allBatchStudents.length}{batch.max_capacity ? <span className="text-base font-normal text-muted-foreground">/{batch.max_capacity}</span> : ""}</p>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(batchStats.totalCollected, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Admission: {formatCurrency(batchStats.admissionCollected, currency)} · Monthly: {formatCurrency(batchStats.monthlyCollected, currency)}
            </p>
          </CardContent>
        </Card>

        {/* Pending + Overdue */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(batchStats.totalPending, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Admission: {formatCurrency(batchStats.admissionPending, currency)} · Monthly: {formatCurrency(batchStats.monthlyPending, currency)}
            </p>
            {batchStats.overdueStudentCount > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <span className="text-xs font-medium text-destructive">
                  {formatCurrency(batchStats.overdueAmount, currency)} overdue ({batchStats.overdueStudentCount} student{batchStats.overdueStudentCount > 1 ? "s" : ""})
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Month */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <MonthYearPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                minYear={batch.start_date ? new Date(batch.start_date).getFullYear() : 2020}
                maxYear={batch.end_date ? new Date(batch.end_date).getFullYear() : new Date().getFullYear() + 2}
                className="h-7 w-auto text-xs font-medium border-0 shadow-none px-1"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{formatCurrency(batchStats.thisMonthCollected, currency)}</p>
            {batchStats.thisMonthDue > 0 ? (
              <>
                <Progress value={batchStats.thisMonthPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{batchStats.thisMonthPercent}% of {formatCurrency(batchStats.thisMonthDue, currency)} due</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No fees due this month</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Overdue */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <MonthYearPicker
                value={selectedOverdueMonth}
                onChange={setSelectedOverdueMonth}
                minYear={batch.start_date ? new Date(batch.start_date).getFullYear() : 2020}
                maxYear={batch.end_date ? new Date(batch.end_date).getFullYear() : new Date().getFullYear() + 2}
                className="h-7 w-auto text-xs font-medium border-0 shadow-none px-1"
              />
            </div>
          </CardHeader>
          <CardContent>
            {batchStats.perMonthOverdueCount > 0 ? (
              <>
                <p className="text-2xl font-bold text-destructive">{batchStats.perMonthOverdueCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  student{batchStats.perMonthOverdueCount > 1 ? "s" : ""} overdue
                </p>
                <p className="text-sm font-semibold text-destructive mt-2">
                  {formatCurrency(batchStats.perMonthOverdueAmount, currency)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No overdue for this month</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Enrolled Students</CardTitle>
            <span className="text-sm text-muted-foreground">{batchStudents.length} students</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students in this batch..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {studentSearch && (
              <button onClick={() => setStudentSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {batchStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {studentSearch ? (
                <>
                  <Search className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No students match your search.</p>
                  <Button variant="link" onClick={() => setStudentSearch("")}>Clear search</Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No students in this batch yet.</p>
                  {canAddRevenue && <Button variant="link" onClick={() => setStudentDialogOpen(true)}>Add Student</Button>}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Enrolled</TableHead>
                      <TableHead>Admission</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead className="hidden md:table-cell">Total Paid</TableHead>
                      <TableHead className="hidden md:table-cell">Total Pending</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Payment</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((s) => {
                      const sum = studentSummaries.get(s.id);
                      const lastPayment = allPayments
                        .filter((p) => p.student_id === s.id)
                        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
                      return (
                        <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/students/${s.id}`)}>
                          <TableCell>
                            <div>
                              <span className="font-medium text-primary">{s.name}</span>
                              {s.student_id_number && <p className="text-xs text-muted-foreground">{s.student_id_number}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {format(new Date(s.enrollment_date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {sum ? (() => {
                              const effAdm = Number(s.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
                              if (effAdm === 0) return <span className="text-muted-foreground text-sm">N/A</span>;
                              return (
                                <div className="flex flex-col gap-0.5">
                                  {sum.admissionStatus === "paid" ? (
                                    <Badge className="block w-fit bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Paid</Badge>
                                  ) : sum.admissionStatus === "partial" ? (
                                    <span className="block text-xs text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(sum.admissionPaid, currency)}/{formatCurrency(effAdm, currency)}</span>
                                  ) : (
                                    <>
                                      <span className="block text-xs text-muted-foreground">{formatCurrency(effAdm, currency)}</span>
                                      <Badge variant="destructive" className="block w-fit">Pending</Badge>
                                    </>
                                  )}
                                </div>
                              );
                            })() : "—"}
                          </TableCell>
                          <TableCell>
                            {sum ? (() => {
                              const effMonthly = Number(s.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;
                              if (effMonthly === 0) return <span className="text-muted-foreground text-sm">N/A</span>;
                              return (
                                <div className="flex flex-col gap-0.5">
                                  {sum.monthlyOverdueMonths.length > 0 ? (
                                    <Badge className="block w-fit bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">{sum.monthlyOverdueMonths.length} overdue</Badge>
                                  ) : (sum.monthlyPendingMonths.length + sum.monthlyPartialMonths.length) > 0 ? (
                                    <Badge className="block w-fit bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30">{sum.monthlyPendingMonths.length + sum.monthlyPartialMonths.length} pending</Badge>
                                  ) : sum.monthlyPaidMonths.length > 0 && sum.monthlyPendingMonths.length === 0 && sum.monthlyPartialMonths.length === 0 ? (
                                    <Badge className="block w-fit bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Paid</Badge>
                                  ) : (
                                    <Badge className="block w-fit bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Current</Badge>
                                  )}
                                </div>
                              );
                            })() : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-semibold text-green-600 dark:text-green-400">
                            {sum ? formatCurrency(sum.totalPaid, currency) : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-semibold text-orange-600 dark:text-orange-400">
                            {sum && sum.totalPending > 0 ? formatCurrency(sum.totalPending, currency) : "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {lastPayment ? format(new Date(lastPayment.payment_date), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/students/${s.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStudent(s); setEditStudentDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canAddRevenue && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStudent(s); setPaymentDialogOpen(true); }}>
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteStudentId(s.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={pagination.currentPage} totalPages={pagination.totalPages}
                totalItems={pagination.totalItems} startIndex={pagination.startIndex}
                endIndex={pagination.endIndex} itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.goToPage} onItemsPerPageChange={pagination.setItemsPerPage}
                canGoNext={pagination.canGoNext} canGoPrev={pagination.canGoPrev}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <BatchDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} batch={batch} onSave={handleUpdate} />
      <StudentDialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen} onSave={handleCreateStudent} defaultBatchId={id} lockedBatch />
      <StudentDialog
        open={editStudentDialogOpen}
        onOpenChange={(o) => { setEditStudentDialogOpen(o); if (!o) setEditingStudent(null); }}
        student={editingStudent}
        onSave={handleUpdateStudent}
        defaultBatchId={id}
        lockedBatch
      />

      {selectedStudent && (
        <StudentPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) setSelectedStudent(null); }}
          student={selectedStudent}
          summary={studentSummaries.get(selectedStudent.id) || { admissionPaid: 0, admissionTotal: 0, admissionPending: 0, admissionStatus: "pending", monthlyPaidMonths: [], monthlyPartialMonths: [], monthlyOverdueMonths: [], monthlyPendingMonths: [], monthlyPaymentsByMonth: new Map(), monthlyPaidTotal: 0, monthlyPendingTotal: 0, totalPaid: 0, totalPending: 0, totalExpected: 0, overallPercent: 0 }}
          onSave={handlePayment}
        />
      )}

      {/* Delete Student Confirmation */}
      <AlertDialog open={!!deleteStudentId} onOpenChange={(o) => { if (!o) setDeleteStudentId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this student and all their payment records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteStudent(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

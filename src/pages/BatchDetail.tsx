import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, parse } from "date-fns";
import BatchDateFilter, { type BatchFilterValue, getDefaultBatchFilter, getFilterLabel, isMonthIncluded } from "@/components/shared/BatchDateFilter";
import { useBatch, useUpdateBatch, type BatchInsert } from "@/hooks/useBatches";
import { useCourse } from "@/hooks/useCourses";
import { useAllStudents } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Eye, CreditCard, Users, TrendingUp, CalendarDays, Layers, Plus, AlertTriangle, Search, X, Info, Trash2, SlidersHorizontal, BookOpen, Loader2, UserPlus, UserMinus, PauseCircle } from "lucide-react";
import StudentOverdueSection from "@/components/students/StudentOverdueSection";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import BatchDialog from "@/components/dialogs/BatchDialog";
import StudentDialog from "@/components/dialogs/StudentDialog";
import BatchEnrollDialog from "@/components/dialogs/BatchEnrollDialog";
import StudentPaymentDialog from "@/components/dialogs/StudentPaymentDialog";
import { useUpdateStudent, useDeleteStudent, type StudentInsert } from "@/hooks/useStudents";
import { useCreateStudentPayment } from "@/hooks/useStudentPayments";
import { useCreateBatchHistory } from "@/hooks/useStudentBatchHistory";
import { useAuth } from "@/contexts/AuthContext";
import { syncBatchEnrollment } from "@/utils/enrollmentSync";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/shared/TablePagination";

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddRevenue, canEdit, isModerator, canEditBatch, canAddBatch, isCompanyAdmin, isCipher, isLoading: companyLoading, activeCompanyId } = useCompany();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  const { data: batch, isLoading: batchLoading } = useBatch(id);
  const courseId = (batch as any)?.course_id;
  const { data: course } = useCourse(courseId);
  const { data: allStudents = [], isLoading: studentsLoading } = useAllStudents();
  const { data: allPayments = [] } = useStudentPayments();

  // Fetch batch enrollments for this batch to resolve batchEnrollmentId
  const { data: batchEnrollments = [] } = useQuery({
    queryKey: ["batch_enrollments", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("batch_enrollments")
        .select("id, student_id, status")
        .eq("batch_id", id)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useUpdateBatch();
  
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();
  const createPaymentMutation = useCreateStudentPayment();
  const createBatchHistory = useCreateBatchHistory();
  const { user } = useAuth();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editStudentDialogOpen, setEditStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [removeConfirmText, setRemoveConfirmText] = useState("");
  const [removePaymentTotal, setRemovePaymentTotal] = useState(0);
  const [inactiveStudentId, setInactiveStudentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [studentSort, setStudentSort] = useState("name-asc");

  // Redirect DEO without edit permission
  useEffect(() => {
    if (!companyLoading && isModerator && !canEditBatch) {
      navigate("/courses", { replace: true });
    }
  }, [companyLoading, isModerator, canEditBatch, navigate]);

  // Debounce student search with 500ms
  useEffect(() => {
    if (studentSearch.length < 3 && studentSearch.length > 0) {
      setDebouncedStudentSearch("");
      return;
    }
    if (studentSearch.length === 0) {
      setDebouncedStudentSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedStudentSearch(studentSearch), 500);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  const [filterValue, setFilterValue] = useState<BatchFilterValue>(getDefaultBatchFilter);

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

  // Build a Set of student IDs from active batch_enrollments
  const enrolledStudentIdSet = useMemo(() => {
    return new Set(batchEnrollments.map((e: any) => e.student_id));
  }, [batchEnrollments]);

  // All students in this batch (unfiltered, for stats)
  const allBatchStudents = useMemo(() => {
    if (!id) return [];
    return allStudents.filter((s: any) => enrolledStudentIdSet.has(s.id));
  }, [allStudents, id, enrolledStudentIdSet]);

  // Summaries for all batch students
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

  // Compute worst status for each student (needed for payment status filter)
  const studentWorstStatuses = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allBatchStudents) {
      const sum = allSummaries.get(s.id);
      const effMonthly = Number(s.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;
      let worstStatus = "na";
      if (sum && effMonthly > 0) {
        const allMonths = [...sum.monthlyPaidMonths, ...sum.monthlyPartialMonths, ...sum.monthlyOverdueMonths, ...sum.monthlyPendingMonths];
        const includedMonths = allMonths.filter((m) => isMonthIncluded(m, filterValue));
        if (includedMonths.length > 0) {
          const overdueMonths = sum.monthlyOverdueMonths.filter((m) => isMonthIncluded(m, filterValue));
          const partialMonths = sum.monthlyPartialMonths.filter((m) => isMonthIncluded(m, filterValue));
          const pendingMonths = sum.monthlyPendingMonths.filter((m) => isMonthIncluded(m, filterValue));
          const allPaid = includedMonths.every((m) => sum.monthlyPaidMonths.includes(m));
          if (overdueMonths.length > 0) worstStatus = "overdue";
          else if (partialMonths.length > 0) worstStatus = "partial";
          else if (pendingMonths.length > 0) worstStatus = "pending";
          else if (allPaid) worstStatus = "paid";
        }
      }
      map.set(s.id, worstStatus);
    }
    return map;
  }, [allBatchStudents, allSummaries, batch, filterValue]);

  // Filtered batch students
  const batchStudents = useMemo(() => {
    if (!id) return [];
    let students = allBatchStudents;

    // Name search (debounced)
    if (debouncedStudentSearch.trim()) {
      const q = debouncedStudentSearch.toLowerCase();
      students = students.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.student_id_number && s.student_id_number.toLowerCase().includes(q)) ||
        (s.father_name && s.father_name.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
      );
    }

    // Status filter
    if (studentStatusFilter !== "all") {
      students = students.filter((s) => s.status === studentStatusFilter);
    }

    // Payment status filter
    if (paymentStatusFilter !== "all") {
      students = students.filter((s) => studentWorstStatuses.get(s.id) === paymentStatusFilter);
    }

    // Sort
    students = [...students].sort((a, b) => {
      switch (studentSort) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "newest": return new Date(b.enrollment_date).getTime() - new Date(a.enrollment_date).getTime();
        case "oldest": return new Date(a.enrollment_date).getTime() - new Date(b.enrollment_date).getTime();
        default: return a.name.localeCompare(b.name);
      }
    });

    return students;
  }, [allBatchStudents, id, debouncedStudentSearch, studentStatusFilter, paymentStatusFilter, studentWorstStatuses, studentSort]);

  const studentSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentSummary>>();
    for (const s of batchStudents) {
      const existing = allSummaries.get(s.id);
      if (existing) map.set(s.id, existing);
    }
    return map;
  }, [batchStudents, allSummaries]);

  const batchStats = useMemo(() => {
    let totalCollected = 0;
    let totalPending = 0;
    let admissionCollected = 0;
    let admissionPending = 0;
    let overdueAmount = 0;
    let overdueStudentCount = 0;
    let admissionFullyPaidCount = 0;
    let totalMonthsDue = 0;
    let totalMonthsPaid = 0;

    let monthDue = 0;
    let monthCollected = 0;
    let monthOverdueCount = 0;
    let monthOverdueAmount = 0;

    for (const [sid, sum] of allSummaries.entries()) {
      const student = allBatchStudents.find((s) => s.id === sid);
      if (!student) continue;

      const effAdm = Number(student.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
      const effMonthly = Number(student.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;

      totalCollected += sum.totalPaid;
      totalPending += sum.totalPending;
      admissionCollected += sum.admissionPaid;
      admissionPending += Math.max(0, effAdm - sum.admissionPaid);

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

      // Filter-based stats
      const allMonths = [...sum.monthlyPaidMonths, ...sum.monthlyPartialMonths, ...sum.monthlyOverdueMonths, ...sum.monthlyPendingMonths];
      const includedMonths = allMonths.filter((m) => isMonthIncluded(m, filterValue));

      for (const m of includedMonths) {
        monthDue += effMonthly;
        monthCollected += sum.monthlyPaymentsByMonth.get(m) || 0;
      }

      // Include admission fees in total collected/due
      monthDue += effAdm;
      monthCollected += sum.admissionPaid;

      // Overdue for included months
      const overdueInRange = sum.monthlyOverdueMonths.filter((m) => isMonthIncluded(m, filterValue));
      const partialInRange = sum.monthlyPartialMonths.filter((m) => isMonthIncluded(m, filterValue));
      if (overdueInRange.length > 0 || partialInRange.length > 0) {
        monthOverdueCount++;
        for (const m of [...overdueInRange, ...partialInRange]) {
          monthOverdueAmount += effMonthly - (sum.monthlyPaymentsByMonth.get(m) || 0);
        }
      }
    }

    const studentCount = allBatchStudents.length;
    const admissionPercent = studentCount > 0 ? Math.round((admissionFullyPaidCount / studentCount) * 100) : 0;
    const monthlyPercent = totalMonthsDue > 0 ? Math.round((totalMonthsPaid / totalMonthsDue) * 100) : 0;
    const monthPercent = monthDue > 0 ? Math.round((monthCollected / monthDue) * 100) : 0;
    const monthPending = Math.max(0, monthDue - monthCollected);

    return {
      totalCollected, totalPending,
      admissionCollected, admissionPending,
      overdueAmount, overdueStudentCount,
      admissionPercent, monthlyPercent,
      monthDue, monthCollected, monthPercent, monthPending,
      monthOverdueCount, monthOverdueAmount,
    };
  }, [allSummaries, allBatchStudents, batch, filterValue]);

  // Students with effective fee amounts for overdue section
  const effectiveBatchStudents = useMemo(() => {
    return allBatchStudents.map(s => ({
      ...s,
      monthly_fee_amount: Number(s.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0,
      admission_fee_total: Number(s.admission_fee_total) || Number(batch?.default_admission_fee) || 0,
    }));
  }, [allBatchStudents, batch]);

  const pagination = usePagination(batchStudents);

  useEffect(() => {
    pagination.goToPage(1);
  }, [debouncedStudentSearch, studentStatusFilter, paymentStatusFilter, studentSort]);

  const activeFilterCount = (studentStatusFilter !== "all" ? 1 : 0) + (paymentStatusFilter !== "all" ? 1 : 0) + (studentSort !== "name-asc" ? 1 : 0);

  const resetStudentFilters = () => {
    setStudentSearch("");
    setDebouncedStudentSearch("");
    setStudentStatusFilter("all");
    setPaymentStatusFilter("all");
    setStudentSort("name-asc");
  };

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

  // Calculate payment total when a student is selected for removal
  useEffect(() => {
    if (!deleteStudentId || !id || !activeCompanyId) {
      setRemovePaymentTotal(0);
      setRemoveConfirmText("");
      return;
    }
    // Find enrollment and sum payments
    const enrollment = batchEnrollments.find(e => e.student_id === deleteStudentId);
    if (!enrollment) { setRemovePaymentTotal(0); return; }
    supabase
      .from("student_payments")
      .select("amount")
      .eq("batch_enrollment_id", enrollment.id)
      .eq("company_id", activeCompanyId)
      .then(({ data }) => {
        const total = (data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
        setRemovePaymentTotal(total);
      });
  }, [deleteStudentId, id, activeCompanyId, batchEnrollments]);

  const handleRemoveFromBatch = async () => {
    if (!deleteStudentId || !id || !activeCompanyId || !user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc("remove_student_from_batch", {
        p_student_id: deleteStudentId,
        p_batch_id: id,
        p_company_id: activeCompanyId,
        p_user_id: user.id,
        p_user_email: user.email ?? null,
      });
      if (error) throw error;

      const studentName = allBatchStudents.find(s => s.id === deleteStudentId)?.name ?? "Student";
      toast({ title: `${studentName} removed from ${batch?.batch_name}. Revenue updated.` });
      setDeleteStudentId(null);
      setRemoveConfirmText("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSetInactive = async () => {
    if (!inactiveStudentId) return;
    setDeleting(true);
    try {
      await updateStudentMutation.mutateAsync({ id: inactiveStudentId, status: "inactive" as any });
      const studentName = allBatchStudents.find(s => s.id === inactiveStudentId)?.name ?? "Student";
      toast({ title: `${studentName} set as inactive. Payments preserved, overdue tracking stopped.` });
      setInactiveStudentId(null);
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
        <Button variant="link" onClick={() => navigate("/courses")}>Back to Courses</Button>
      </div>
    );
  }

  const backUrl = courseId && course ? `/courses/${courseId}` : "/courses";

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
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{batch.batch_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}><ArrowLeft className="h-4 w-4" /></Button>
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
        <div className="flex items-center gap-2 flex-wrap">
          <BatchDateFilter
            value={filterValue}
            onChange={setFilterValue}
            minYear={batch.start_date ? new Date(batch.start_date).getFullYear() : 2020}
            maxYear={batch.end_date ? new Date(batch.end_date).getFullYear() : new Date().getFullYear() + 2}
          />
          {canEdit && <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
          {(isCompanyAdmin || isCipher || canAddBatch) && (
            <>
              <Button onClick={() => setStudentDialogOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Enroll Student</Button>
              <Button variant="outline" onClick={() => navigate(`/students/new?batch=${id}`)}><Plus className="mr-2 h-4 w-4" />New Student</Button>
            </>
          )}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">{getFilterLabel("Collected", filterValue)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(batchStats.monthCollected, currency)}</p>
            {batchStats.monthDue > 0 ? (
              <>
                <Progress value={batchStats.monthPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{batchStats.monthPercent}% of {formatCurrency(batchStats.monthDue, currency)} due</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No fees due for this period</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">{getFilterLabel("Pending", filterValue)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(batchStats.monthPending, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Admission pending: {formatCurrency(batchStats.admissionPending, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm font-medium text-muted-foreground">{getFilterLabel("Overdue", filterValue)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {batchStats.monthOverdueCount > 0 ? (
              <>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(batchStats.monthOverdueAmount, currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {batchStats.monthOverdueCount} student{batchStats.monthOverdueCount > 1 ? "s" : ""} overdue
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No overdue for this period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overdue Report */}
      {allBatchStudents.length > 0 && (
        <StudentOverdueSection
          students={effectiveBatchStudents}
          studentSummaries={allSummaries}
        />
      )}

      {/* Students Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Enrolled Students</CardTitle>
            <span className="text-sm text-muted-foreground">
              {batchStudents.length !== allBatchStudents.length
                ? `Showing ${batchStudents.length} of ${allBatchStudents.length}`
                : `${allBatchStudents.length} students`}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, father name, phone... (min 3 chars)"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {studentSearch.length > 0 && studentSearch.length < 3 && (
                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  {3 - studentSearch.length} more
                </span>
              )}
              {studentSearch.length >= 3 && debouncedStudentSearch !== studentSearch && (
                <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              {studentSearch && (
                <button onClick={() => { setStudentSearch(""); setDebouncedStudentSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={studentSort} onValueChange={setStudentSort}>
              <SelectTrigger className="w-[150px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="newest">Newest Enrolled</SelectItem>
                <SelectItem value="oldest">Oldest Enrolled</SelectItem>
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetStudentFilters} className="gap-1">
                <X className="h-3 w-3" />
                Reset
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">{activeFilterCount}</Badge>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {batchStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {studentSearch || studentStatusFilter !== "all" || paymentStatusFilter !== "all" ? (
                <>
                  <Search className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No students match your filters.</p>
                  <Button variant="link" onClick={resetStudentFilters}>Clear filters</Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No students in this batch yet.</p>
                  {canAddRevenue && (
                    <div className="flex gap-2 mt-2">
                      <Button variant="link" onClick={() => setStudentDialogOpen(true)}>Enroll Existing Student</Button>
                      <Button variant="link" onClick={() => navigate(`/students/new?batch=${id}`)}>Create New Student</Button>
                    </div>
                  )}
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
                      <TableHead className="hidden md:table-cell">{filterValue.mode === "monthly" ? "Month Paid" : filterValue.mode === "custom" ? "Range Paid" : "Total Paid"}</TableHead>
                      <TableHead className="hidden md:table-cell">{filterValue.mode === "monthly" ? "Month Pending" : filterValue.mode === "custom" ? "Range Pending" : "Total Pending"}</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Payment</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((s) => {
                      const sum = studentSummaries.get(s.id);
                      const effMonthly = Number(s.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;

                      let filteredPaid = 0;
                      let filteredPending = 0;
                      const worstStatus = studentWorstStatuses.get(s.id) || "na";
                      let pendingMonthCount = 0;
                      let overdueMonthCount = 0;
                      let partialMonthCount = 0;
                      let purelyPendingCount = 0;
                      let partialPaidAmount = 0;
                      let partialTotalAmount = 0;

                      if (sum && effMonthly > 0) {
                        const allMonths = [...sum.monthlyPaidMonths, ...sum.monthlyPartialMonths, ...sum.monthlyOverdueMonths, ...sum.monthlyPendingMonths];
                        const includedMonths = allMonths.filter((m) => isMonthIncluded(m, filterValue));

                        for (const m of includedMonths) {
                          const paid = sum.monthlyPaymentsByMonth.get(m) || 0;
                          filteredPaid += paid;
                          filteredPending += Math.max(0, effMonthly - paid);
                        }

                        if (includedMonths.length > 0) {
                          const overdueMonths = sum.monthlyOverdueMonths.filter((m) => isMonthIncluded(m, filterValue));
                          const partialMonths = sum.monthlyPartialMonths.filter((m) => isMonthIncluded(m, filterValue));
                          const pendingMonths = sum.monthlyPendingMonths.filter((m) => isMonthIncluded(m, filterValue));

                          pendingMonthCount = pendingMonths.length + overdueMonths.length + partialMonths.length;
                          overdueMonthCount = overdueMonths.length;
                          partialMonthCount = partialMonths.length;
                          purelyPendingCount = pendingMonths.length;

                          // Compute paid/total for partial months
                          for (const m of partialMonths) {
                            partialPaidAmount += sum.monthlyPaymentsByMonth.get(m) || 0;
                            partialTotalAmount += effMonthly;
                          }
                        }
                      }

                      const lastPayment = allPayments
                        .filter((p) => p.student_id === s.id)
                        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

                      return (
                        <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/students/${s.id}?from_batch=${id}`)}>
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
                                    <span className="block text-xs font-medium text-orange-600 dark:text-orange-400">{formatCurrency(0, currency)}/{formatCurrency(effAdm, currency)}</span>
                                  )}
                                </div>
                              );
                            })() : "—"}
                          </TableCell>
                          <TableCell>
                            {sum ? (() => {
                              if (effMonthly === 0) return <span className="text-muted-foreground text-sm">N/A</span>;
                              if (worstStatus === "na") return <span className="text-muted-foreground text-sm">N/A</span>;
                              return (
                                <div className="flex flex-col gap-0.5">
                                  {worstStatus === "paid" ? (
                                    <Badge className="block w-fit bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Paid</Badge>
                                  ) : worstStatus === "overdue" ? (
                                    <Badge className="block w-fit bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">{overdueMonthCount}/{pendingMonthCount} Overdue</Badge>
                                  ) : worstStatus === "partial" ? (
                                    <Badge className="block w-fit bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                      {formatCurrency(partialPaidAmount, currency)}/{formatCurrency(partialTotalAmount, currency)} Partial
                                    </Badge>
                                  ) : worstStatus === "pending" ? (
                                    <Badge className="block w-fit bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30">{purelyPendingCount} months pending</Badge>
                                  ) : (
                                    <Badge className="block w-fit bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Current</Badge>
                                  )}
                                </div>
                              );
                            })() : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {worstStatus !== "na" ? (
                              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(filteredPaid, currency)}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {(() => {
                              const effAdm = Number(s.admission_fee_total) || Number(batch?.default_admission_fee) || 0;
                              const admPending = Math.max(0, effAdm - (sum?.admissionPaid || 0));
                              const overallPending = filteredPending + admPending;
                              return overallPending > 0 ? (
                                <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(overallPending, currency)}</span>
                              ) : <span className="text-muted-foreground">—</span>;
                            })()}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {lastPayment ? format(new Date(lastPayment.payment_date), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => navigate(`/students/${s.id}?from_batch=${id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">View</span>
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStudent(s); setEditStudentDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canAddRevenue && (() => {
                                const sPending = allSummaries.get(s.id)?.totalPending ?? 1;
                                return sPending <= 0 ? (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 cursor-not-allowed" disabled title="All fees collected">
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStudent(s); setPaymentDialogOpen(true); }}>
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                );
                              })()}
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteStudentId(s.id)} title="Remove from batch">
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              )}
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" onClick={() => setInactiveStudentId(s.id)} title="Set inactive">
                                  <PauseCircle className="h-4 w-4" />
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
      <BatchEnrollDialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen} batchId={id!} batchName={batch.batch_name} courseId={batch.course_id} />
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
          summary={allSummaries.get(selectedStudent.id) || { admissionPaid: 0, admissionTotal: 0, admissionPending: 0, admissionStatus: "pending", monthlyPaidMonths: [], monthlyPartialMonths: [], monthlyOverdueMonths: [], monthlyPendingMonths: [], monthlyPaymentsByMonth: new Map(), monthlyPaidTotal: 0, monthlyPendingTotal: 0, totalPaid: 0, totalPending: 0, totalExpected: 0, overallPercent: 0 }}
          onSave={handlePayment}
          batchDefaultAdmissionFee={Number(batch?.default_admission_fee) || 0}
          batchDefaultMonthlyFee={Number(batch?.default_monthly_fee) || 0}
          courseName={course?.course_name}
          batchName={batch?.batch_name}
          batchEnrollmentId={batchEnrollments.find(e => e.student_id === selectedStudent.id)?.id}
        />
      )}

      {/* Remove from Batch Confirmation */}
      <AlertDialog open={!!deleteStudentId} onOpenChange={(o) => { if (!o) { setDeleteStudentId(null); setRemoveConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Batch</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Removing <strong>{allBatchStudents.find(s => s.id === deleteStudentId)?.name}</strong> from <strong>{batch?.batch_name}</strong> will permanently delete all payment records for this enrollment
                  {removePaymentTotal > 0 && <> and deduct <strong>{formatCurrency(removePaymentTotal, currency)}</strong> from company revenue</>}.
                  This cannot be undone.
                </p>
                <div>
                  <label className="text-xs font-medium text-foreground">Type "REMOVE" to confirm:</label>
                  <Input
                    value={removeConfirmText}
                    onChange={(e) => setRemoveConfirmText(e.target.value)}
                    placeholder="REMOVE"
                    className="mt-1"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRemoveFromBatch(); }}
              disabled={deleting || removeConfirmText !== "REMOVE"}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Inactive Confirmation */}
      <AlertDialog open={!!inactiveStudentId} onOpenChange={(o) => { if (!o) setInactiveStudentId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Student Inactive</AlertDialogTitle>
            <AlertDialogDescription>
              Set <strong>{allBatchStudents.find(s => s.id === inactiveStudentId)?.name}</strong> as inactive? Payments will be preserved but overdue tracking will stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSetInactive(); }}
              disabled={deleting}
              className="bg-yellow-600 text-white hover:bg-yellow-700"
            >
              {deleting ? "Updating..." : "Set Inactive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

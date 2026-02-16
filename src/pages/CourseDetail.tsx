import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useCourse, useUpdateCourse, useDeleteCourse, type CourseInsert } from "@/hooks/useCourses";
import { useBatches, useCreateBatch, useUpdateBatch, useDeleteBatch, type Batch, type BatchInsert } from "@/hooks/useBatches";
import { useAllStudents } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Trash2, Plus, Eye, BookOpen, Users, TrendingUp, Layers, Loader2, CalendarDays, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CourseDialog from "@/components/dialogs/CourseDialog";
import BatchDialog from "@/components/dialogs/BatchDialog";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/shared/TablePagination";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddRevenue, canEdit, canDelete, isDataEntryOperator, canAddBatch, canEditBatch, canDeleteBatch } = useCompany();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  const { data: course, isLoading: courseLoading } = useCourse(id);
  const { data: allBatches = [], isLoading: batchesLoading } = useBatches();
  const { data: allStudents = [] } = useAllStudents();
  const { data: allPayments = [] } = useStudentPayments();

  const updateCourseMutation = useUpdateCourse();
  const deleteCourseMutation = useDeleteCourse();
  const createBatchMutation = useCreateBatch();
  const updateBatchMutation = useUpdateBatch();
  const deleteBatchMutation = useDeleteBatch();

  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);

  // Batches for this course
  const courseBatches = useMemo(() => {
    if (!id) return [];
    return allBatches.filter((b: any) => b.course_id === id);
  }, [allBatches, id]);

  // Batch analytics
  const batchAnalytics = useMemo(() => {
    const map = new Map<string, { studentCount: number; revenue: number; pending: number }>();
    for (const b of courseBatches) {
      const students = allStudents.filter((s: any) => s.batch_id === b.id);
      let revenue = 0, pending = 0;
      for (const s of students) {
        const effAdm = Number(s.admission_fee_total) || Number(b.default_admission_fee) || 0;
        const effMonthly = Number(s.monthly_fee_amount) || Number(b.default_monthly_fee) || 0;
        const batchStart = new Date(b.start_date);
        const batchCourseStart = `${batchStart.getFullYear()}-${String(batchStart.getMonth() + 1).padStart(2, "0")}`;
        let batchCourseEnd = "";
        if (b.course_duration_months) {
          const endDate = new Date(batchStart);
          endDate.setMonth(endDate.getMonth() + b.course_duration_months - 1);
          batchCourseEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
        }
        const effectiveStudent = { ...s, admission_fee_total: effAdm, monthly_fee_amount: effMonthly, course_start_month: s.course_start_month || batchCourseStart || null, course_end_month: s.course_end_month || batchCourseEnd || null };
        const payments = allPayments.filter((p) => p.student_id === s.id);
        const sum = computeStudentSummary(effectiveStudent, payments);
        revenue += sum.totalPaid;
        pending += sum.totalPending;
      }
      map.set(b.id, { studentCount: students.length, revenue, pending });
    }
    return map;
  }, [courseBatches, allStudents, allPayments]);

  // Totals
  const totals = useMemo(() => {
    let students = 0, revenue = 0, pending = 0;
    for (const a of batchAnalytics.values()) {
      students += a.studentCount;
      revenue += a.revenue;
      pending += a.pending;
    }
    return { batches: courseBatches.length, students, revenue, pending };
  }, [batchAnalytics, courseBatches]);

  const pagination = usePagination(courseBatches);

  const handleUpdateCourse = async (data: CourseInsert) => {
    if (!course) return;
    try {
      await updateCourseMutation.mutateAsync({ id: course.id, ...data });
      toast({ title: "Course updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    try {
      await deleteCourseMutation.mutateAsync(course.id);
      toast({ title: "Course deleted" });
      navigate("/courses");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateBatch = async (data: BatchInsert) => {
    try {
      await createBatchMutation.mutateAsync({ ...data, course_id: id } as any);
      toast({ title: "Batch created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdateBatch = async (data: BatchInsert) => {
    if (!editBatch) return;
    try {
      await updateBatchMutation.mutateAsync({ id: editBatch.id, ...data });
      toast({ title: "Batch updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleteBatchId) return;
    const analytics = batchAnalytics.get(deleteBatchId);
    if (analytics && analytics.studentCount > 0) {
      toast({ title: "Cannot delete", description: `This batch has ${analytics.studentCount} student(s). Remove or reassign them first.`, variant: "destructive" });
      setDeleteBatchId(null);
      return;
    }
    try {
      await deleteBatchMutation.mutateAsync(deleteBatchId);
      toast({ title: "Batch deleted" });
      setDeleteBatchId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const effectiveCanAdd = canAddRevenue || canAddBatch;
  const effectiveCanEdit = canEdit || canEditBatch;
  const effectiveCanDelete = canDelete || canDeleteBatch;

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Active</Badge>;
      case "completed": return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">Completed</Badge>;
      case "inactive": return <Badge variant="secondary">Inactive</Badge>;
      case "archived": return <Badge variant="secondary">Archived</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (courseLoading || batchesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Course not found</p>
        <Button variant="link" onClick={() => navigate("/courses")}>Back to Courses</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/courses">Courses</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course.course_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{course.course_name}</h1>
              {statusBadge(course.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {course.course_code}
              {course.category && ` · ${course.category}`}
              {course.duration_months && ` · ${course.duration_months} months`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {effectiveCanEdit && <Button variant="outline" onClick={() => setEditCourseOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
          {effectiveCanDelete && courseBatches.length === 0 && (
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteCourseOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </Button>
          )}
          {effectiveCanAdd && (
            <Button onClick={() => { setEditBatch(null); setBatchDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Add Batch
            </Button>
          )}
        </div>
      </div>

      {/* Course Info */}
      {course.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{course.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {!isDataEntryOperator && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{totals.batches}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{totals.students}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totals.revenue, currency)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
              <Layers className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totals.pending, currency)}</p></CardContent>
          </Card>
        </div>
      )}

      {/* Batches Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Batches</CardTitle>
          <span className="text-sm text-muted-foreground">{courseBatches.length} batches</span>
        </CardHeader>
        <CardContent>
          {courseBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4"><Layers className="h-8 w-8 text-muted-foreground" /></div>
              <h3 className="mb-2 text-lg font-semibold">No batches yet</h3>
              <p className="mb-4 max-w-sm text-muted-foreground">Add your first batch to this course.</p>
              {effectiveCanAdd && <Button onClick={() => { setEditBatch(null); setBatchDialogOpen(true); }}>Add Batch</Button>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Code</TableHead>
                      <TableHead className="hidden md:table-cell">Start Date</TableHead>
                      <TableHead>Students</TableHead>
                      {!isDataEntryOperator && <TableHead className="hidden lg:table-cell">Revenue</TableHead>}
                      {!isDataEntryOperator && <TableHead className="hidden lg:table-cell">Pending</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((b) => {
                      const analytics = batchAnalytics.get(b.id);
                      return (
                        <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/batches/${b.id}`)}>
                          <TableCell><span className="font-medium text-primary hover:underline">{b.batch_name}</span></TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{b.batch_code}</TableCell>
                          <TableCell className="hidden md:table-cell">{format(new Date(b.start_date), "MMM d, yyyy")}</TableCell>
                          <TableCell><Badge variant="secondary">{analytics?.studentCount || 0}{b.max_capacity ? `/${b.max_capacity}` : ""}</Badge></TableCell>
                          {!isDataEntryOperator && (
                            <TableCell className="hidden lg:table-cell">
                              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(analytics?.revenue || 0, currency)}</span>
                            </TableCell>
                          )}
                          {!isDataEntryOperator && (
                            <TableCell className="hidden lg:table-cell">
                              {(analytics?.pending || 0) > 0 ? (
                                <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(analytics?.pending || 0, currency)}</span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          )}
                          <TableCell>{statusBadge(b.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/batches/${b.id}`)}><Eye className="h-4 w-4" /></Button>
                              {effectiveCanEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditBatch(b); setBatchDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              )}
                              {effectiveCanDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteBatchId(b.id)}><Trash2 className="h-4 w-4" /></Button>
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

      {/* Course Edit Dialog */}
      <CourseDialog open={editCourseOpen} onOpenChange={setEditCourseOpen} course={course} onSave={handleUpdateCourse} />

      {/* Batch Dialog */}
      <BatchDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        batch={editBatch}
        onSave={editBatch ? handleUpdateBatch : handleCreateBatch}
        courseId={id}
        courseDurationMonths={course.duration_months}
      />

      {/* Delete Batch */}
      <AlertDialog open={!!deleteBatchId} onOpenChange={(open) => { if (!open) setDeleteBatchId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              {(batchAnalytics.get(deleteBatchId || "")?.studentCount || 0) > 0
                ? `This batch has ${batchAnalytics.get(deleteBatchId || "")?.studentCount} student(s). Remove or reassign them first.`
                : "This will permanently delete this batch."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteBatch(); }} disabled={(batchAnalytics.get(deleteBatchId || "")?.studentCount || 0) > 0} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Course */}
      <AlertDialog open={deleteCourseOpen} onOpenChange={setDeleteCourseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this course. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteCourse(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

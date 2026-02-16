import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse, type Course, type CourseInsert } from "@/hooks/useCourses";
import { useBatches } from "@/hooks/useBatches";
import { useStudents } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Eye, Pencil, Trash2, BookOpen, Search, X, Loader2, TrendingUp, Users, SlidersHorizontal, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import CourseDialog from "@/components/CourseDialog";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

export default function Courses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState("newest");
  const { data: courses = [], isLoading } = useCourses({ search, status: statusFilter });
  const { data: allBatches = [] } = useBatches();
  const { data: allStudents = [] } = useStudents();
  const { data: allPayments = [] } = useStudentPayments();
  const { canAddRevenue, canEdit, canDelete, isCompanyViewer, isDataEntryOperator, canAddBatch, canEditBatch, canDeleteBatch } = useCompany();
  const { user } = useAuth();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const deleteMutation = useDeleteCourse();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter courses for DEO
  const filteredCourses = useMemo(() => {
    if (!isDataEntryOperator) return courses;
    return courses.filter(c => c.user_id === user?.id);
  }, [courses, isDataEntryOperator, user?.id]);

  // Course analytics
  const courseAnalytics = useMemo(() => {
    const map = new Map<string, { batchCount: number; studentCount: number; revenue: number; pending: number }>();
    for (const c of filteredCourses) {
      const batches = allBatches.filter((b: any) => b.course_id === c.id);
      let studentCount = 0;
      let revenue = 0;
      let pending = 0;
      for (const b of batches) {
        const students = allStudents.filter((s: any) => s.batch_id === b.id);
        studentCount += students.length;
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
          const effectiveStudent = {
            ...s,
            admission_fee_total: effAdm,
            monthly_fee_amount: effMonthly,
            course_start_month: s.course_start_month || batchCourseStart || null,
            course_end_month: s.course_end_month || batchCourseEnd || null,
          };
          const payments = allPayments.filter((p) => p.student_id === s.id);
          const sum = computeStudentSummary(effectiveStudent, payments);
          revenue += sum.totalPaid;
          pending += sum.totalPending;
        }
      }
      map.set(c.id, { batchCount: batches.length, studentCount, revenue, pending });
    }
    return map;
  }, [filteredCourses, allBatches, allStudents, allPayments]);

  // Sort
  const sortedCourses = useMemo(() => {
    const sorted = [...filteredCourses];
    switch (sortBy) {
      case "name-asc": sorted.sort((a, b) => a.course_name.localeCompare(b.course_name)); break;
      case "name-desc": sorted.sort((a, b) => b.course_name.localeCompare(a.course_name)); break;
      case "newest": sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest": sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
    }
    return sorted;
  }, [filteredCourses, sortBy]);

  const pagination = usePagination(sortedCourses);

  useEffect(() => {
    pagination.goToPage(1);
  }, [search, statusFilter, sortBy]);

  // Totals
  const totals = useMemo(() => {
    let students = 0, revenue = 0, pending = 0;
    for (const a of courseAnalytics.values()) {
      students += a.studentCount;
      revenue += a.revenue;
      pending += a.pending;
    }
    return { courses: filteredCourses.length, students, revenue, pending };
  }, [courseAnalytics, filteredCourses]);

  const handleCreate = async (data: CourseInsert) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Course created successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdate = async (data: CourseInsert) => {
    if (!editCourse) return;
    try {
      await updateMutation.mutateAsync({ id: editCourse.id, ...data });
      toast({ title: "Course updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Course deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Active</Badge>;
      case "inactive": return <Badge variant="secondary">Inactive</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const effectiveCanAdd = canAddRevenue || canAddBatch;
  const effectiveCanEdit = canEdit || canEditBatch;
  const effectiveCanDelete = canDelete || canDeleteBatch;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-32 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <SkeletonTable rows={5} columns={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
            {isCompanyViewer && <Badge variant="secondary" className="text-xs">View Only</Badge>}
            {isDataEntryOperator && <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 text-xs">Data Entry</Badge>}
          </div>
          <p className="text-muted-foreground">Organize batches under courses and track course-level analytics</p>
        </div>
        {effectiveCanAdd && (
          <Button onClick={() => { setEditCourse(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Create Course
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {!isDataEntryOperator && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{totals.courses}</p></CardContent>
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

      {/* Courses Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">All Courses</CardTitle>
            <span className="text-sm text-muted-foreground">{filteredCourses.length} courses</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-9" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sortedCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
              <h3 className="mb-2 text-lg font-semibold">No courses yet</h3>
              <p className="mb-4 max-w-sm text-muted-foreground">Create your first course to organize batches.</p>
              {effectiveCanAdd && <Button onClick={() => { setEditCourse(null); setDialogOpen(true); }}>Create Course</Button>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Code</TableHead>
                      <TableHead className="hidden md:table-cell">Category</TableHead>
                      <TableHead>Batches</TableHead>
                      <TableHead>Students</TableHead>
                      {!isDataEntryOperator && <TableHead className="hidden lg:table-cell">Revenue</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((c) => {
                      const analytics = courseAnalytics.get(c.id);
                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/courses/${c.id}`)}>
                          <TableCell>
                            <span className="font-medium text-primary hover:underline">{c.course_name}</span>
                            {c.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{c.course_code}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{c.category || "—"}</TableCell>
                          <TableCell><Badge variant="secondary">{analytics?.batchCount || 0}</Badge></TableCell>
                          <TableCell><Badge variant="secondary">{analytics?.studentCount || 0}</Badge></TableCell>
                          {!isDataEntryOperator && (
                            <TableCell className="hidden lg:table-cell">
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(analytics?.revenue || 0, currency)}
                              </span>
                            </TableCell>
                          )}
                          <TableCell>{statusBadge(c.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {!isDataEntryOperator && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/courses/${c.id}`)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {effectiveCanEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditCourse(c); setDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {effectiveCanDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
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

      {/* Create/Edit Dialog */}
      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={editCourse}
        onSave={editCourse ? handleUpdate : handleCreate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deleteMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              {(courseAnalytics.get(deleteId || "")?.batchCount || 0) > 0
                ? `This course has ${courseAnalytics.get(deleteId || "")?.batchCount} batch(es). Remove or reassign them before deleting.`
                : "This will permanently delete this course. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteMutation.isPending || (courseAnalytics.get(deleteId || "")?.batchCount || 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

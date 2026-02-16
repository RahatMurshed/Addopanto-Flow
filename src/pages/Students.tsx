import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useStudents, useAllStudents, useCreateStudent, useDeleteStudent, useBulkDeleteStudents, type StudentInsert, type Student } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, CreditCard, Trash2, GraduationCap, Users, AlertTriangle, Loader2, Search, Upload, Layers, GripVertical, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/shared/SkeletonLoaders";
import StudentDialog from "@/components/dialogs/StudentDialog";
import StudentWizardDialog from "@/components/dialogs/StudentWizardDialog";
import StudentPaymentDialog from "@/components/dialogs/StudentPaymentDialog";
import BulkImportDialog from "@/components/dialogs/BulkImportDialog";
import BatchAssignDialog from "@/components/dialogs/BatchAssignDialog";
import BatchDropZone from "@/components/shared/BatchDropZone";
import ExportButtons from "@/components/shared/ExportButtons";
import StudentExportDialog from "@/components/dialogs/StudentExportDialog";
import { useCreateStudentPayment } from "@/hooks/useStudentPayments";
import TablePagination from "@/components/shared/TablePagination";
import StudentFilters, { defaultFilters, type StudentFilterValues } from "@/components/students/StudentFilters";
import { useSavedSearchPresets, useCreatePreset, useDeletePreset } from "@/hooks/useSavedSearchPresets";
import StudentsDashboard from "@/components/students/StudentsDashboard";
import StudentProfileDialog from "@/components/dialogs/StudentProfileDialog";
import { useBatches } from "@/hooks/useBatches";
import PiiRestrictionBanner from "@/components/shared/PiiRestrictionBanner";
export default function Students() {
  const [filters, setFilters] = useState<StudentFilterValues>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Server-side paginated query
  const { data: paginatedResult, isLoading } = useStudents({
    search: filters.search,
    status: filters.status as any,
    sortBy: filters.sortBy as any,
    sortOrder: filters.sortOrder,
    batchId: filters.batchId,
    gender: filters.gender,
    classGrade: filters.classGrade,
    addressCity: filters.addressCity,
    addressState: filters.addressState,
    addressArea: filters.addressArea,
    addressPinZip: filters.addressPinZip,
    academicYear: filters.academicYear,
    page,
    pageSize,
  });

  const serverStudents = paginatedResult?.data ?? [];
  const serverTotalCount = paginatedResult?.totalCount ?? 0;

  // All students for summary cards & overdue section (uses separate cached query)
  const { data: allStudentsRaw = [] } = useAllStudents();
  const { data: allPayments = [] } = useStudentPayments();
  const { data: batchesData = [] } = useBatches({ status: "all" });
  const { canAddRevenue, canEdit, canDelete, isCompanyViewer, isDataEntryOperator, canAddStudent, canEditStudent, canDeleteStudent, canAddPayment, canViewStudentPII, activeCompanyId } = useCompany();
  const { user } = useAuth();
  
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  const navigate = useNavigate();
  const { toast } = useToast();

  // DEO filter for all students (summary cards)
  const allStudents = useMemo(() => {
    if (!isDataEntryOperator) return allStudentsRaw;
    return allStudentsRaw.filter(s => s.user_id === user?.id);
  }, [allStudentsRaw, isDataEntryOperator, user?.id]);

  // DEO filter for paginated students
  const students = useMemo(() => {
    if (!isDataEntryOperator) return serverStudents;
    return serverStudents.filter(s => s.user_id === user?.id);
  }, [serverStudents, isDataEntryOperator, user?.id]);

  const createMutation = useCreateStudent();
  const deleteMutation = useDeleteStudent();
  const bulkDeleteMutation = useBulkDeleteStudents();
  const createPaymentMutation = useCreateStudentPayment();

  // Saved search presets
  const { data: savedPresets = [] } = useSavedSearchPresets();
  const createPresetMutation = useCreatePreset();
  const deletePresetMutation = useDeletePreset();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Compute summaries for all students (for summary cards)
  const allStudentSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentSummary>>();
    for (const s of allStudents) {
      const payments = allPayments.filter((p) => p.student_id === s.id);
      map.set(s.id, computeStudentSummary(s, payments));
    }
    return map;
  }, [allStudents, allPayments]);

  // Compute summaries for current page students
  const studentSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentSummary>>();
    for (const s of students) {
      const payments = allPayments.filter((p) => p.student_id === s.id);
      map.set(s.id, computeStudentSummary(s, payments));
    }
    return map;
  }, [students, allPayments]);

  // Client-side payment status filters on current page
  const filteredStudents = useMemo(() => {
    let result = students;

    if (filters.admissionStatus !== "all") {
      result = result.filter((s) => {
        const sum = studentSummaries.get(s.id);
        if (!sum) return false;
        if (sum.admissionTotal === 0) return filters.admissionStatus === "paid";
        return sum.admissionStatus === filters.admissionStatus;
      });
    }

    if (filters.monthlyStatus !== "all") {
      result = result.filter((s) => {
        const sum = studentSummaries.get(s.id);
        if (!sum) return false;
        if (Number(s.monthly_fee_amount) === 0) return filters.monthlyStatus === "paid";
        if (filters.monthlyStatus === "overdue") return sum.monthlyOverdueMonths.length > 0;
        if (filters.monthlyStatus === "pending") return (sum.monthlyPartialMonths.length + sum.monthlyPendingMonths.length + sum.monthlyOverdueMonths.length) > 0;
        if (filters.monthlyStatus === "paid") return sum.monthlyOverdueMonths.length === 0 && sum.monthlyPartialMonths.length === 0 && sum.monthlyPendingMonths.length === 0;
        return true;
      });
    }

    return result;
  }, [students, studentSummaries, filters.admissionStatus, filters.monthlyStatus]);

  // totalStudents used below for filters display
  const totalStudents = allStudents.length;
  // Server-side pagination calculations
  const totalPages = Math.max(1, Math.ceil(serverTotalCount / pageSize));
  const startIndex = serverTotalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, serverTotalCount);

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, filters]);

  // Selection helpers
  const currentPageIds = useMemo(() => filteredStudents.map(s => s.id), [filteredStudents]);
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));
  const somePageSelected = currentPageIds.some(id => selectedIds.has(id));

  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedStudentNames = useMemo(() => {
    return filteredStudents.filter(s => selectedIds.has(s.id)).map(s => s.name);
  }, [filteredStudents, selectedIds]);

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredStudents.forEach(s => map.set(s.id, s.name));
    return map;
  }, [filteredStudents]);

  // Batch name lookup
  const batchNameMap = useMemo(() => {
    const map = new Map<string, string>();
    batchesData.forEach(b => map.set(b.id, b.batch_name));
    return map;
  }, [batchesData]);

  const handleDragStart = useCallback((e: React.DragEvent, studentId: string) => {
    e.dataTransfer.setData("text/student-id", studentId);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCreate = async (data: StudentInsert) => {
    try {
      const result = await createMutation.mutateAsync(data);
      toast({ title: "Student added successfully" });
      return result;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Student deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      await bulkDeleteMutation.mutateAsync(ids);
      toast({ title: `${ids.length} student${ids.length > 1 ? "s" : ""} deleted` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePayment = async (data: any) => {
    try {
      await createPaymentMutation.mutateAsync(data);
      toast({ title: "Payment recorded successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  // Export handled by StudentExportDialog

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-32 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="flex gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-36" />)}</div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
        <SkeletonTable rows={6} columns={8} />
      </div>
    );
  }

  const effectiveCanAdd = canAddRevenue || canAddStudent;
  const effectiveCanEdit = canEdit || canEditStudent;
  const effectiveCanDelete = canDelete || canDeleteStudent;
  const effectiveCanPayment = canAddRevenue || canAddPayment;

  return (
    <div className="space-y-6">
      {!canViewStudentPII && <PiiRestrictionBanner />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Students</h1>
            {isCompanyViewer && <Badge variant="secondary" className="text-xs">View Only</Badge>}
            {isDataEntryOperator && <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 text-xs">Data Entry</Badge>}
          </div>
          <p className="text-muted-foreground">Manage student profiles and track fee payments</p>
        </div>
        <div className="flex gap-2">
          {filteredStudents.length > 0 && (
            <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          )}
          {effectiveCanAdd && (
            <>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
              <Button onClick={() => navigate("/students/new")}>
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard - hidden for DEO */}
      {!isDataEntryOperator && (
        <StudentsDashboard
          allStudents={allStudents}
          batches={batchesData}
          onSetFilters={(partial) => setFilters({ ...defaultFilters, ...partial })}
          onImport={() => setImportDialogOpen(true)}
          onExport={() => setExportDialogOpen(true)}
          canAdd={effectiveCanAdd}
          hasStudents={allStudents.length > 0}
        />
      )}

      {/* Students Table */}
      {allStudents.length === 0 && filters.search === "" && filters.status === "all" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4"><GraduationCap className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="mb-2 text-lg font-semibold">No students yet</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">Add your first student to start tracking admission fees and monthly tuition payments.</p>
            {effectiveCanAdd && <Button onClick={() => navigate("/students/new")}>Add Student</Button>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">All Students</CardTitle>
              <span className="text-sm text-muted-foreground">{serverTotalCount} students</span>
            </div>
            <StudentFilters
              filters={filters}
              onChange={setFilters}
              totalResults={filteredStudents.length}
              totalStudents={totalStudents}
              savedPresets={savedPresets}
              onSavePreset={(name) => createPresetMutation.mutate({ name, filters })}
              onDeletePreset={(id) => deletePresetMutation.mutate(id)}
              onLoadPreset={(presetFilters) => {
                setFilters({ ...defaultFilters, ...presetFilters });
              }}
            />

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (effectiveCanEdit || effectiveCanDelete) && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <span className="text-sm font-medium">
                  {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected
                </span>
                {effectiveCanEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchAssignOpen(true)}
                  >
                    <Layers className="mr-1.5 h-3.5 w-3.5" />
                    Assign to Batch
                  </Button>
                )}
                {effectiveCanDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Drag-and-drop batch drop zone */}
            {effectiveCanEdit && isDragging && (
              <BatchDropZone
                selectedIds={selectedIds}
                studentNameMap={studentNameMap}
                onSuccess={() => setSelectedIds(new Set())}
              />
            )}
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No students match your filters.</p>
                <Button variant="link" className="mt-2" onClick={() => setFilters(defaultFilters)}>
                  Clear all filters
                </Button>
              </div>
            ) : (
            <>
              <div className="overflow-x-auto" id="students-table">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                       {effectiveCanEdit && (
                        <TableHead className="w-10">
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                            <Checkbox
                              checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                              onCheckedChange={toggleAll}
                              aria-label="Select all on page"
                            />
                          </div>
                        </TableHead>
                      )}
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Student ID</TableHead>
                      <TableHead className="hidden md:table-cell">Class</TableHead>
                      <TableHead className="hidden lg:table-cell">Father Name</TableHead>
                      <TableHead className="hidden md:table-cell">Contact</TableHead>
                      <TableHead>Enrollment</TableHead>
                      <TableHead className="hidden sm:table-cell">Batch</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => {
                      const isSelected = selectedIds.has(s.id);
                      const isEnrolled = s.batch_id != null;
                      const batchName = s.batch_id ? batchNameMap.get(s.batch_id) || "—" : "—";
                      return (
                        <TableRow
                          key={s.id}
                          className={`${isSelected ? "bg-primary/5" : ""} ${effectiveCanEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
                          draggable={effectiveCanEdit}
                          onDragStart={(e) => handleDragStart(e, s.id)}
                          onDragEnd={handleDragEnd}
                        >
                          {effectiveCanEdit && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleOne(s.id)}
                                  aria-label={`Select ${s.name}`}
                                />
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{s.student_id_number || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{s.class_grade || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{s.father_name || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{s.phone || "—"}</TableCell>
                          <TableCell>
                            {isEnrolled ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Enrolled</Badge>
                            ) : (
                              <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30">Not Enrolled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{batchName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setProfileStudent(s); setProfileOpen(true); }}>
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="hidden lg:inline">View</span>
                                </Button>
                              {effectiveCanPayment && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStudent(s); setPaymentDialogOpen(true); }}>
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                              {effectiveCanDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
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
                currentPage={page}
                totalPages={totalPages}
                totalItems={serverTotalCount}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={pageSize}
                onPageChange={setPage}
                onItemsPerPageChange={(size) => { setPageSize(size); setPage(1); }}
                itemsPerPageOptions={[25, 50, 100, 200]}
                canGoNext={page < totalPages}
                canGoPrev={page > 1}
              />
            </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Student Wizard */}
      <StudentWizardDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleCreate} />

      {/* Export Dialog */}
      <StudentExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        students={filteredStudents}
        studentSummaries={studentSummaries}
        filters={filters}
        totalCount={serverTotalCount}
        activeCompanyId={activeCompanyId}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {/* Batch Assignment Dialog */}
      <BatchAssignDialog
        open={batchAssignOpen}
        onOpenChange={setBatchAssignOpen}
        studentIds={Array.from(selectedIds)}
        studentNames={selectedStudentNames}
        onSuccess={() => setSelectedIds(new Set())}
      />

      {/* Payment Dialog */}
      {selectedStudent && (
        <StudentPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) setSelectedStudent(null); }}
          student={selectedStudent}
          summary={studentSummaries.get(selectedStudent.id) || { admissionPaid: 0, admissionTotal: 0, admissionPending: 0, admissionStatus: "pending", monthlyPaidMonths: [], monthlyPartialMonths: [], monthlyOverdueMonths: [], monthlyPendingMonths: [], monthlyPaymentsByMonth: new Map(), monthlyPaidTotal: 0, monthlyPendingTotal: 0, totalPaid: 0, totalPending: 0, totalExpected: 0, overallPercent: 0 }}
          onSave={handlePayment}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deleteMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this student and all their payment records. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => { if (!open && !bulkDeleteMutation.isPending) setBulkDeleteOpen(false); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (bulkDeleteMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Students</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} and all their payment records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleBulkDelete(); }} disabled={bulkDeleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : `Delete ${selectedIds.size} Students`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Student Profile Dialog */}
      <StudentProfileDialog
        student={profileStudent}
        open={profileOpen}
        onOpenChange={(o) => { setProfileOpen(o); if (!o) setProfileStudent(null); }}
        canEdit={effectiveCanEdit}
        batchName={profileStudent?.batch_id ? batchNameMap.get(profileStudent.batch_id) || "—" : "—"}
        onEdit={() => {
          setProfileOpen(false);
          if (profileStudent) navigate(`/students/${profileStudent.id}`);
        }}
      />
    </div>
  );
}

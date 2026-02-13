import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useStudents, useCreateStudent, useDeleteStudent, type StudentInsert } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useRole } from "@/contexts/RoleContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrency } from "@/utils/currencyUtils";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, CreditCard, Trash2, GraduationCap, Users, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import StudentDialog from "@/components/StudentDialog";
import StudentPaymentDialog from "@/components/StudentPaymentDialog";
import { useCreateStudentPayment } from "@/hooks/useStudentPayments";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";
import StudentOverdueSection from "@/components/StudentOverdueSection";

export default function Students() {
  const { data: students = [], isLoading } = useStudents();
  const { data: allPayments = [] } = useStudentPayments();
  const { canAddRevenue, canEdit, canDelete } = useRole();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useCreateStudent();
  const deleteMutation = useDeleteStudent();
  const createPaymentMutation = useCreateStudentPayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Compute summaries for all students
  const studentSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentSummary>>();
    for (const s of students) {
      const payments = allPayments.filter((p) => p.student_id === s.id);
      map.set(s.id, computeStudentSummary(s, payments));
    }
    return map;
  }, [students, allPayments]);

  // Summary cards
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "active").length;
  const pendingAdmission = students.filter((s) => {
    const sum = studentSummaries.get(s.id);
    return sum && sum.admissionStatus !== "paid" && sum.admissionTotal > 0;
  }).length;
  const overdueStudents = students.filter((s) => {
    const sum = studentSummaries.get(s.id);
    return sum && sum.monthlyOverdueMonths.length > 0;
  }).length;

  const pagination = usePagination(students);

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

  const handlePayment = async (data: any) => {
    try {
      await createPaymentMutation.mutateAsync(data);
      toast({ title: "Payment recorded successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-32 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <SkeletonTable rows={6} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage student profiles and track fee payments</p>
        </div>
        {canAddRevenue && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalStudents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{activeStudents}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Admission</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">{pendingAdmission}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Monthly</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{overdueStudents}</p></CardContent>
        </Card>
      </div>

      {/* Monthly Overdue Section */}
      {students.length > 0 && (
        <StudentOverdueSection
          students={students}
          studentSummaries={studentSummaries}
          currency={currency}
        />
      )}

      {/* Students Table */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4"><GraduationCap className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="mb-2 text-lg font-semibold">No students yet</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">Add your first student to start tracking admission fees and monthly tuition payments.</p>
            {canAddRevenue && <Button onClick={() => setDialogOpen(true)}>Add Student</Button>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">All Students</CardTitle>
            <span className="text-sm text-muted-foreground">{totalStudents} students</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Student ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admission</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead className="hidden md:table-cell">Total Paid</TableHead>
                    <TableHead className="hidden md:table-cell">Total Pending</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((s) => {
                    const sum = studentSummaries.get(s.id)!;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{s.student_id_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {sum.admissionTotal === 0 ? (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          ) : sum.admissionStatus === "paid" ? (
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Paid</Badge>
                          ) : sum.admissionStatus === "partial" ? (
                            <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                              {formatCurrency(sum.admissionPaid, currency)}/{formatCurrency(sum.admissionTotal, currency)}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {Number(s.monthly_fee_amount) === 0 ? (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          ) : (() => {
                            const totalPendingMonths = sum.monthlyOverdueMonths.length + sum.monthlyPartialMonths.length + sum.monthlyPendingMonths.length;
                            return totalPendingMonths > 0 ? (
                              <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30">{totalPendingMonths} months pending</Badge>
                            ) : sum.monthlyPaidMonths.length > 0 ? (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Paid</Badge>
                            ) : (
                              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Current</Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-semibold text-primary">
                          {formatCurrency(sum.totalPaid, currency)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-semibold text-destructive">
                          {sum.totalPending > 0 ? formatCurrency(sum.totalPending, currency) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/students/${s.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canAddRevenue && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStudent(s); setPaymentDialogOpen(true); }}>
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
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
              currentPage={pagination.currentPage} totalPages={pagination.totalPages}
              totalItems={pagination.totalItems} startIndex={pagination.startIndex}
              endIndex={pagination.endIndex} itemsPerPage={pagination.itemsPerPage}
              onPageChange={pagination.goToPage} onItemsPerPageChange={pagination.setItemsPerPage}
              canGoNext={pagination.canGoNext} canGoPrev={pagination.canGoPrev}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Student Dialog */}
      <StudentDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleCreate} />

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
    </div>
  );
}
